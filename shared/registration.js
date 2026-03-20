(() => {
  const form = document.getElementById('registrationForm');
  if (!form) {
    return;
  }

  const submitButton = document.getElementById('submitButton');
  const hiddenIframe = document.getElementById('hiddenIframe');
  const messageDiv = document.getElementById('formMessage');
  const emailInput = document.getElementById('email');
  const eventInput = document.getElementById('event');
  const capacityStatus = document.getElementById('capacityStatus');

  let lastCheckedEmail = '';
  let lastCheckedEvent = '';
  let lastCheckExists = false;
  let lastKnownCapacity = null;
  let isChecking = false;
  let isLoadingCapacity = false;
  let allowSubmit = false;
  let isSubmitting = false;

  function showMessage(message, type) {
    if (!messageDiv) {
      return;
    }
    messageDiv.textContent = message;
    messageDiv.className = 'form-message ' + type;
    messageDiv.style.display = 'block';

    if (type === 'success' || type === 'error') {
      setTimeout(() => {
        messageDiv.style.display = 'none';
      }, 5000);
    }
  }

  function normalizeEmail(value) {
    return (value || '').trim().toLowerCase();
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function getEventValue() {
    return eventInput ? eventInput.value.trim() : '';
  }

  const scriptUrl = form.getAttribute('data-script-url');
  if (!scriptUrl || scriptUrl === 'YOUR_GOOGLE_SCRIPT_WEB_APP_URL_HERE') {
    showMessage('错误：请先配置 Google Apps Script URL', 'error');
    return;
  }

  form.action = scriptUrl;
  form.method = 'POST';
  form.target = 'hiddenIframe';

  function jsonpRequest(action, params, callback) {
    const callbackName = `check_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const cleanup = (scriptEl) => {
      if (scriptEl && scriptEl.parentNode) {
        scriptEl.parentNode.removeChild(scriptEl);
      }
      delete window[callbackName];
    };

    window[callbackName] = (result) => {
      cleanup(script);
      callback(result);
    };

    const script = document.createElement('script');
    const query = new URLSearchParams(Object.assign({}, params, {
      action: action,
      callback: callbackName
    }));
    script.src = `${scriptUrl}?${query.toString()}`;
    script.onerror = () => {
      cleanup(script);
      callback({ success: false, error: 'network' });
    };
    document.body.appendChild(script);
  }

  function updateCapacityStatus(result) {
    if (!capacityStatus || !result || typeof result !== 'object') {
      return;
    }

    const hasLimit = typeof result.limit === 'number';
    const rawCount = typeof result.count === 'number' ? result.count : 0;
    const count = hasLimit ? Math.min(rawCount, result.limit) : rawCount;
    const remaining = typeof result.remaining === 'number'
      ? (hasLimit ? Math.max(0, Math.min(result.remaining, result.limit)) : result.remaining)
      : (hasLimit ? Math.max(0, result.limit - count) : null);
    const isFull = Boolean(result.isFull || (hasLimit && rawCount >= result.limit) || (hasLimit && remaining === 0));

    lastKnownCapacity = {
      hasLimit,
      count,
      remaining,
      isFull
    };

    if (!hasLimit) {
      capacityStatus.textContent = '报名进行中';
      capacityStatus.className = 'capacity-status';
      return;
    }

    if (isFull) {
      capacityStatus.textContent = '报名已满';
      capacityStatus.className = 'capacity-status full';
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = '报名已满';
      }
      return;
    }

    capacityStatus.textContent = `报名中 · 剩余 ${remaining} 个名额（已报名 ${count}/${result.limit}）`;
    capacityStatus.className = 'capacity-status open';
    if (submitButton && !isSubmitting && !lastCheckExists) {
      submitButton.disabled = false;
      submitButton.textContent = '提交报名';
    }
  }

  function refreshCapacityStatus() {
    const event = getEventValue();
    if (!event || !capacityStatus) {
      return;
    }

    isLoadingCapacity = true;
    if (submitButton && !isSubmitting) {
      submitButton.disabled = true;
      submitButton.textContent = '查询报名状态中...';
    }

    jsonpRequest('status', { event }, (result) => {
      isLoadingCapacity = false;
      updateCapacityStatus(result);
    });
  }

  function runDuplicateCheck(email, event, onDone) {
    if (!email || !event) {
      onDone({ exists: false });
      return;
    }
    if (isChecking) {
      return;
    }
    isChecking = true;
    jsonpRequest('check', { email, event }, (result) => {
      isChecking = false;
      onDone(result || { exists: false });
    });
  }

  function handleDuplicateResult(email, event, result) {
    const exists = Boolean(result && result.exists);
    lastCheckedEmail = email;
    lastCheckedEvent = event;
    lastCheckExists = exists;

    if (exists) {
      showMessage('该邮箱已报名，无需重复提交。', 'error');
      if (submitButton) {
        submitButton.disabled = true;
      }
    } else if (submitButton && !(lastKnownCapacity && lastKnownCapacity.isFull)) {
      submitButton.disabled = false;
    }

    updateCapacityStatus(result);
  }

  if (emailInput) {
    const checkOnBlur = () => {
      const email = normalizeEmail(emailInput.value);
      const event = getEventValue();
      if (!email || !isValidEmail(email)) {
        return;
      }

      runDuplicateCheck(email, event, (result) => {
        handleDuplicateResult(email, event, result);
      });
    };

    emailInput.addEventListener('blur', checkOnBlur);
    emailInput.addEventListener('change', checkOnBlur);
  }

  function startSubmission() {
    if (isSubmitting) {
      return;
    }
    isSubmitting = true;
    const timestampInput = document.getElementById('timestamp');
    if (timestampInput) {
      timestampInput.value = new Date().toISOString();
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = '提交中...';
    }
    showMessage('正在提交报名信息...', 'loading');

    let timeoutId = setTimeout(() => {
      if (submitButton && submitButton.disabled) {
        try {
          const iframeUrl = hiddenIframe && hiddenIframe.contentWindow
            ? hiddenIframe.contentWindow.location.href
            : '';
          if (iframeUrl && (iframeUrl.includes('error') || iframeUrl.includes('403') || iframeUrl.includes('401'))) {
            showMessage('报名未成功，请检查信息是否正确，或联系主办方报名。', 'error');
          } else {
            showMessage('报名成功，请查收确认邮件。若未收到，请检查邮箱地址或垃圾邮件箱。', 'success');
            form.reset();
          }
        } catch (error) {
          showMessage('报名成功，请查收确认邮件。若未收到，请检查邮箱地址或垃圾邮件箱。', 'success');
          form.reset();
        }
        isSubmitting = false;
        submitButton.disabled = false;
        submitButton.textContent = '提交报名';
      }
    }, 5000);

    if (hiddenIframe) {
      hiddenIframe.addEventListener('load', function clearTimeout() {
        clearTimeout(timeoutId);
      }, { once: true });
    }
  }

  if (hiddenIframe) {
    hiddenIframe.addEventListener('load', () => {
      try {
        const iframeDoc = hiddenIframe.contentDocument || hiddenIframe.contentWindow.document;
        const responseText = iframeDoc.body ? iframeDoc.body.innerText : '';

        if (responseText.includes('duplicate')) {
          showMessage('该邮箱已报名，无需重复提交。', 'error');
        } else if (responseText.includes('email_failed')) {
          showMessage('报名已记录，但确认邮件发送失败，请联系主办方。', 'error');
        } else if (responseText.includes('"full"') || responseText.includes('活动已满')) {
          showMessage('报名已满，当前活动最多接受 40 人。', 'error');
        } else if (responseText.includes('success') || responseText.includes('成功') || responseText.includes('OK')) {
          showMessage('报名成功，请查收确认邮件。若未收到，请检查邮箱地址或垃圾邮件箱。', 'success');
          form.reset();
        } else if (responseText.includes('error') || responseText.includes('Error') || responseText.includes('403') || responseText.includes('401')) {
          showMessage('报名未成功，请检查信息是否正确，或联系主办方报名。', 'error');
        } else {
          showMessage('报名成功，请查收确认邮件。若未收到，请检查邮箱地址或垃圾邮件箱。', 'success');
          form.reset();
        }
      } catch (error) {
        try {
          const iframeUrl = hiddenIframe.contentWindow.location.href;
          if (iframeUrl.includes('duplicate')) {
            showMessage('该邮箱已报名，无需重复提交。', 'error');
          } else if (iframeUrl.includes('email_failed')) {
            showMessage('报名已记录，但确认邮件发送失败，请联系主办方。', 'error');
          } else if (iframeUrl.includes('full')) {
            showMessage('报名已满，当前活动最多接受 40 人。', 'error');
          } else if (iframeUrl.includes('error') || iframeUrl.includes('403') || iframeUrl.includes('401')) {
            showMessage('报名未成功，请检查信息是否正确，或联系主办方报名。', 'error');
          } else {
            showMessage('报名成功，请查收确认邮件。若未收到，请检查邮箱地址或垃圾邮件箱。', 'success');
            form.reset();
          }
        } catch (urlError) {
          showMessage('报名成功，请查收确认邮件。若未收到，请检查邮箱地址或垃圾邮件箱。', 'success');
          form.reset();
        }
      }

      if (submitButton) {
        isSubmitting = false;
        if (lastKnownCapacity && lastKnownCapacity.isFull) {
          submitButton.disabled = true;
          submitButton.textContent = '报名已满';
        } else {
          submitButton.disabled = false;
          submitButton.textContent = '提交报名';
        }
      }
      refreshCapacityStatus();
    });

    hiddenIframe.addEventListener('error', () => {
      showMessage('报名未成功，请检查信息是否正确，或联系主办方报名。', 'error');
      if (submitButton) {
        isSubmitting = false;
        submitButton.disabled = false;
        submitButton.textContent = '提交报名';
      }
    });
  }

  form.addEventListener('submit', (event) => {
    if (isSubmitting) {
      event.preventDefault();
      return false;
    }
    if (allowSubmit) {
      allowSubmit = false;
      startSubmission();
      return;
    }

    const name = document.getElementById('name').value.trim();
    const email = normalizeEmail(emailInput ? emailInput.value : '');
    const company = document.getElementById('company').value.trim();
    const eventId = getEventValue();

    if (!name || !email || !company) {
      event.preventDefault();
      showMessage('请填写所有必填字段', 'error');
      return false;
    }

    if (!isValidEmail(email)) {
      event.preventDefault();
      showMessage('请输入有效的邮箱地址', 'error');
      return false;
    }

    if (isLoadingCapacity || isChecking) {
      event.preventDefault();
      showMessage('正在查询报名状态，请稍候再提交。', 'loading');
      return false;
    }

    if (lastKnownCapacity && lastKnownCapacity.isFull) {
      event.preventDefault();
      showMessage('报名已满，当前活动最多接受 40 人。', 'error');
      return false;
    }

    if (lastCheckedEmail === email && lastCheckedEvent === eventId) {
      if (lastCheckExists) {
        event.preventDefault();
        showMessage('该邮箱已报名，无需重复提交。', 'error');
        return false;
      }
      startSubmission();
      return;
    }

    event.preventDefault();
    runDuplicateCheck(email, eventId, (result) => {
      handleDuplicateResult(email, eventId, result);
      if (result && result.exists) {
        return;
      }
      allowSubmit = true;
      form.submit();
    });
  });

  refreshCapacityStatus();
})();

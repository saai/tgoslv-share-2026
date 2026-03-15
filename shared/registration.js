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

  let lastCheckedEmail = '';
  let lastCheckedEvent = '';
  let lastCheckExists = false;
  let isChecking = false;
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

  function jsonpCheck(email, event, callback) {
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
    const query = new URLSearchParams({
      action: 'check',
      email: email,
      event: event,
      callback: callbackName
    });
    script.src = `${scriptUrl}?${query.toString()}`;
    script.onerror = () => {
      cleanup(script);
      callback({ success: false, error: 'network' });
    };
    document.body.appendChild(script);
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
    jsonpCheck(email, event, (result) => {
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
    } else if (submitButton) {
      submitButton.disabled = false;
    }
  }

  if (emailInput) {
    const checkOnBlur = () => {
      const email = normalizeEmail(emailInput.value);
      const event = getEventValue();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
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
            showMessage('提交失败：权限错误 (403)。请确保 Google Apps Script Web App 的权限设置为"任何人"可访问，并重新部署。', 'error');
          } else {
            showMessage('信息已提交，请按时与会。', 'success');
            form.reset();
          }
        } catch (error) {
          showMessage('提交可能已成功。如果数据未出现在 Sheet 中，请检查 Google Apps Script 的执行日志。', 'success');
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
        } else if (responseText.includes('success') || responseText.includes('成功') || responseText.includes('OK')) {
          showMessage('信息已提交，请按时与会。', 'success');
          form.reset();
        } else if (responseText.includes('error') || responseText.includes('Error') || responseText.includes('403') || responseText.includes('401')) {
          showMessage('提交失败：权限错误。请检查 Google Apps Script 的权限设置，确保 Web App 设置为"任何人"可访问。', 'error');
        } else {
          showMessage('信息已提交，请按时与会。', 'success');
          form.reset();
        }
      } catch (error) {
        try {
          const iframeUrl = hiddenIframe.contentWindow.location.href;
          if (iframeUrl.includes('duplicate')) {
            showMessage('该邮箱已报名，无需重复提交。', 'error');
          } else if (iframeUrl.includes('error') || iframeUrl.includes('403') || iframeUrl.includes('401')) {
            showMessage('提交失败：权限错误。请检查 Google Apps Script 的权限设置。', 'error');
          } else {
            showMessage('信息已提交，请按时与会。', 'success');
            form.reset();
          }
        } catch (urlError) {
          showMessage('信息已提交，请按时与会。', 'success');
          form.reset();
        }
      }

      if (submitButton) {
        isSubmitting = false;
        submitButton.disabled = false;
        submitButton.textContent = '提交报名';
      }
    });

    hiddenIframe.addEventListener('error', () => {
      showMessage('提交失败：网络错误。请检查网络连接后重试。', 'error');
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

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      event.preventDefault();
      showMessage('请输入有效的邮箱地址', 'error');
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
})();

(() => {
  const form = document.getElementById('registrationForm');
  if (!form) {
    return;
  }

  const submitButton = document.getElementById('submitButton');
  const messageDiv = document.getElementById('formMessage');
  const emailInput = document.getElementById('email');
  const eventInput = document.getElementById('event');
  const capacityStatus = document.getElementById('capacityStatus');
  const apiUrl = form.getAttribute('data-api-url') || '/api/registrations';
  const registrationCloseTimes = {
    '202601': '2026-01-24T00:00:00-08:00',
    '202603': '2026-03-21T00:00:00-07:00'
  };

  let lastCheckedEmail = '';
  let lastCheckedEvent = '';
  let lastCheckExists = false;
  let lastKnownCapacity = null;
  let isLoadingCapacity = false;
  let isSubmitting = false;

  function showMessage(message, type) {
    if (!messageDiv) {
      return;
    }

    messageDiv.textContent = message;
    messageDiv.className = `form-message ${type}`;
    messageDiv.style.display = 'block';

    if (type === 'success' || type === 'error') {
      window.setTimeout(() => {
        messageDiv.style.display = 'none';
      }, 5000);
    }
  }

  function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function getEventValue() {
    return eventInput ? eventInput.value.trim() : '';
  }

  function isRegistrationClosedLocally(eventId) {
    const cutoff = registrationCloseTimes[eventId];
    if (!cutoff) {
      return false;
    }
    return Date.now() >= new Date(cutoff).getTime();
  }

  function setSubmitState(disabled, text) {
    if (!submitButton) {
      return;
    }
    submitButton.disabled = disabled;
    submitButton.textContent = text;
  }

  async function requestJson(query, options) {
    const response = await fetch(query, options);
    let data = {};
    try {
      data = await response.json();
    } catch (error) {}

    if (!response.ok) {
      const message = data && data.message ? data.message : 'request_failed';
      throw new Error(message);
    }

    return data;
  }

  function updateCapacityStatus(result) {
    if (!capacityStatus) {
      return;
    }

    if (!result || typeof result.limit !== 'number') {
      capacityStatus.textContent = '报名进行中';
      capacityStatus.className = 'capacity-status';
      lastKnownCapacity = null;
      if (!isSubmitting) {
        setSubmitState(false, '提交报名');
      }
      return;
    }

    const rawCount = typeof result.count === 'number' ? result.count : 0;
    const count = Math.min(rawCount, result.limit);
    const remaining = typeof result.remaining === 'number'
      ? Math.max(0, Math.min(result.remaining, result.limit))
      : Math.max(0, result.limit - count);
    const isFull = Boolean(result.isFull || remaining === 0 || rawCount >= result.limit);

    lastKnownCapacity = {
      count,
      remaining,
      isFull,
      limit: result.limit,
      registrationClosed: Boolean(result.registrationClosed)
    };

    if (result.registrationClosed) {
      capacityStatus.textContent = '报名截止';
      capacityStatus.className = 'capacity-status closed';
      if (!isSubmitting) {
        setSubmitState(true, '报名截止');
      }
      return;
    }

    if (isFull) {
      capacityStatus.textContent = '报名已满';
      capacityStatus.className = 'capacity-status full';
      if (!isSubmitting) {
        setSubmitState(true, '报名已满');
      }
      return;
    }

    capacityStatus.textContent = `报名中 · 剩余 ${remaining} 个名额（已报名 ${count}/${result.limit}）`;
    capacityStatus.className = 'capacity-status open';
    if (!isSubmitting && !lastCheckExists) {
      setSubmitState(false, '提交报名');
    }
  }

  function applyClosedState() {
    if (!capacityStatus) {
      return;
    }

    capacityStatus.textContent = '报名截止';
    capacityStatus.className = 'capacity-status closed';
    lastKnownCapacity = {
      count: 0,
      remaining: 0,
      isFull: false,
      limit: null,
      registrationClosed: true
    };
    if (!isSubmitting) {
      setSubmitState(true, '报名截止');
    }
  }

  async function refreshCapacityStatus() {
    const eventId = getEventValue();
    if (!eventId || !capacityStatus) {
      return;
    }

    isLoadingCapacity = true;
    if (!isSubmitting) {
      setSubmitState(true, '查询报名状态中...');
    }

    try {
      const result = await requestJson(`${apiUrl}?action=status&event=${encodeURIComponent(eventId)}`);
      updateCapacityStatus(result);
    } catch (error) {
      if (isRegistrationClosedLocally(eventId)) {
        applyClosedState();
      } else {
        capacityStatus.textContent = '报名进行中';
        capacityStatus.className = 'capacity-status';
        lastKnownCapacity = null;
        if (!isSubmitting) {
          setSubmitState(false, '提交报名');
        }
      }
    } finally {
      isLoadingCapacity = false;
    }
  }

  async function checkDuplicate(email, eventId) {
    if (!email || !eventId) {
      return { success: true, exists: false };
    }

    const result = await requestJson(
      `${apiUrl}?action=check&event=${encodeURIComponent(eventId)}&email=${encodeURIComponent(email)}`
    );

    lastCheckedEmail = email;
    lastCheckedEvent = eventId;
    lastCheckExists = Boolean(result && result.exists);
    updateCapacityStatus(result);

    return result;
  }

  if (emailInput) {
    const runCheckOnBlur = async () => {
      const email = normalizeEmail(emailInput.value);
      const eventId = getEventValue();
      if (!email || !isValidEmail(email) || !eventId) {
        return;
      }

      try {
        const result = await checkDuplicate(email, eventId);
        if (result.exists) {
          showMessage('该邮箱已报名，无需重复提交。', 'error');
          setSubmitState(true, '提交报名');
        }
      } catch (error) {}
    };

    emailInput.addEventListener('blur', runCheckOnBlur);
    emailInput.addEventListener('change', runCheckOnBlur);
  }

  async function submitRegistration(payload) {
    isSubmitting = true;
    setSubmitState(true, '提交中...');
    showMessage('正在提交报名信息...', 'loading');

    try {
      const result = await requestJson(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (result.error === 'duplicate') {
        showMessage('该邮箱已报名，无需重复提交。', 'error');
        lastCheckExists = true;
      } else if (result.error === 'registration_closed') {
        showMessage('报名已截止。', 'error');
      } else if (result.error === 'full') {
        showMessage('报名已满。', 'error');
      } else if (result.error === 'email_failed') {
        showMessage('报名成功，但确认邮件发送失败，请联系主办方获取活动地址。', 'error');
      } else if (result.success) {
        if (result.emailConfigured === false) {
          showMessage('报名成功。确认邮件未启用，请联系主办方获取活动地址。', 'success');
        } else {
          showMessage('报名成功，请查收确认邮件。若未收到，请检查邮箱地址或垃圾邮件箱。', 'success');
        }
        form.reset();
        lastCheckedEmail = '';
        lastCheckedEvent = '';
        lastCheckExists = false;
      } else {
        showMessage('报名未成功，请检查信息是否正确，或联系主办方报名。', 'error');
      }

      updateCapacityStatus(result);
    } catch (error) {
      showMessage('报名未成功，请检查信息是否正确，或联系主办方报名。', 'error');
    } finally {
      isSubmitting = false;
      if (lastKnownCapacity && lastKnownCapacity.registrationClosed) {
        setSubmitState(true, '报名截止');
      } else if (lastKnownCapacity && lastKnownCapacity.isFull) {
        setSubmitState(true, '报名已满');
      } else {
        setSubmitState(false, '提交报名');
      }
      refreshCapacityStatus();
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const name = document.getElementById('name').value.trim();
    const email = normalizeEmail(emailInput ? emailInput.value : '');
    const company = document.getElementById('company').value.trim();
    const eventId = getEventValue();

    if (!name || !email || !company) {
      showMessage('请填写所有必填字段', 'error');
      return;
    }

    if (!isValidEmail(email)) {
      showMessage('请输入有效的邮箱地址', 'error');
      return;
    }

    if (isLoadingCapacity) {
      showMessage('正在查询报名状态，请稍候再提交。', 'loading');
      return;
    }

    if (lastKnownCapacity && lastKnownCapacity.registrationClosed) {
      showMessage('报名已截止。', 'error');
      return;
    }

    if (lastKnownCapacity && lastKnownCapacity.isFull) {
      showMessage('报名已满。', 'error');
      return;
    }

    try {
      let duplicateResult = null;
      if (lastCheckedEmail === email && lastCheckedEvent === eventId) {
        duplicateResult = { exists: lastCheckExists };
      } else {
        duplicateResult = await checkDuplicate(email, eventId);
      }

      if (duplicateResult.exists) {
        showMessage('该邮箱已报名，无需重复提交。', 'error');
        return;
      }

      if (duplicateResult.registrationClosed) {
        showMessage('报名已截止。', 'error');
        return;
      }

      if (duplicateResult.isFull) {
        showMessage('报名已满。', 'error');
        return;
      }
    } catch (error) {
      showMessage('报名未成功，请检查信息是否正确，或联系主办方报名。', 'error');
      return;
    }

    await submitRegistration({
      name,
      email,
      company,
      event: eventId,
      timestamp: new Date().toISOString()
    });
  });

  refreshCapacityStatus();
})();

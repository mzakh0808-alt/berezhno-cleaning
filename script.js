(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const formatPrice = value => new Intl.NumberFormat('ru-RU').format(value);

  const header = $('#header');
  const menuToggle = $('.menu-toggle');
  const mobileMenu = $('#mobile-menu');

  const setHeaderState = () => header.classList.toggle('is-scrolled', window.scrollY > 12);
  setHeaderState();
  window.addEventListener('scroll', setHeaderState, { passive: true });

  function closeMenu() {
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Открыть меню');
    mobileMenu.hidden = true;
  }

  menuToggle.addEventListener('click', () => {
    const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-expanded', String(!isOpen));
    menuToggle.setAttribute('aria-label', isOpen ? 'Открыть меню' : 'Закрыть меню');
    mobileMenu.hidden = isOpen;
  });

  $$('a', mobileMenu).forEach(link => link.addEventListener('click', closeMenu));
  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) closeMenu();
  });

  const prices = {
    maintenance: { name: 'Поддерживающая уборка', base: 1790, rate: 45, minimum: 4490, time: 0.045 },
    deep: { name: 'Генеральная уборка', base: 2290, rate: 80, minimum: 6990, time: 0.075 },
    renovation: { name: 'Уборка после ремонта', base: 2990, rate: 110, minimum: 8990, time: 0.095 }
  };

  const extras = {
    windows: { name: 'Мытьё окон', price: 1500 },
    oven: { name: 'Духовой шкаф', price: 700 },
    fridge: { name: 'Холодильник', price: 700 },
    balcony: { name: 'Балкон или лоджия', price: 900 }
  };

  const areaInput = $('#area');
  const areaOutput = $('#area-output');
  const priceOutput = $('#estimate-price');
  const descriptionOutput = $('#estimate-description');
  const timeOutput = $('#estimate-time');
  const estimateList = $('#estimate-list');
  let currentEstimate = null;

  function getCalculation() {
    const type = $('input[name="cleaning-type"]:checked').value;
    const config = prices[type];
    const area = Number(areaInput.value);
    const selectedExtras = $$('input[type="checkbox"]', $('#calculator')).filter(input => input.checked).map(input => input.value);
    const extrasTotal = selectedExtras.reduce((total, key) => total + extras[key].price, 0);
    const total = Math.max(config.minimum, config.base + config.rate * area) + extrasTotal;
    const hours = Math.max(2, Math.ceil(area * config.time + selectedExtras.length * 0.35));
    const crew = area > 100 || type === 'renovation' ? 'Работа двух клинеров' : 'Работа одного клинера';
    return { type, config, area, selectedExtras, total, hours, crew };
  }

  function updateCalculator() {
    currentEstimate = getCalculation();
    const { config, area, selectedExtras, total, hours, crew } = currentEstimate;
    areaOutput.value = `${area} м²`;
    areaOutput.textContent = `${area} м²`;
    areaInput.style.setProperty('--range-progress', `${(area - 20) / 180 * 100}%`);
    priceOutput.textContent = formatPrice(total);
    descriptionOutput.textContent = `${config.name} квартиры ${area} м²`;
    timeOutput.textContent = `Около ${hours}–${hours + 1} часов`;
    estimateList.innerHTML = [
      'Средства и оборудование',
      crew,
      ...selectedExtras.map(key => extras[key].name),
      'Проверка по чек-листу'
    ].map(item => `<li>${item}</li>`).join('');
    priceOutput.classList.remove('price-bump');
    void priceOutput.offsetWidth;
    priceOutput.classList.add('price-bump');
  }

  areaInput.addEventListener('input', updateCalculator);
  $$('input[name="cleaning-type"], .extra input').forEach(input => input.addEventListener('change', updateCalculator));
  updateCalculator();

  $$('[data-select-service]').forEach(button => {
    button.addEventListener('click', () => {
      const input = $(`input[name="cleaning-type"][value="${button.dataset.selectService}"]`);
      input.checked = true;
      updateCalculator();
      $('#calculator').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  const bookingDialog = $('#booking-dialog');
  const bookingForm = $('#booking-form');
  const bookingSuccess = $('#booking-success');
  const serviceSelect = $('#booking-service');
  const dateInput = $('#booking-date');
  const phoneInput = $('#booking-phone');
  const summary = $('#form-summary');
  const serviceNames = {
    maintenance: 'Поддерживающая уборка',
    deep: 'Генеральная уборка',
    renovation: 'Уборка после ремонта'
  };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const toDateValue = date => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  dateInput.min = toDateValue(tomorrow);

  function openDialog(dialog) {
    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
    document.body.classList.add('dialog-open');
  }

  function closeDialog(dialog) {
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
    document.body.classList.remove('dialog-open');
  }

  function resetBookingView() {
    bookingForm.hidden = false;
    bookingSuccess.hidden = true;
    summary.hidden = true;
    $$('.is-invalid', bookingForm).forEach(field => field.classList.remove('is-invalid'));
  }

  function showBooking(service, withEstimate = false) {
    closeMenu();
    resetBookingView();
    if (service) serviceSelect.value = service;
    if (withEstimate && currentEstimate) {
      serviceSelect.value = serviceNames[currentEstimate.type];
      $('#form-summary-text').textContent = `${currentEstimate.area} м² · ${currentEstimate.hours}–${currentEstimate.hours + 1} ч`;
      $('#form-summary-price').textContent = `${formatPrice(currentEstimate.total)} ₽`;
      summary.hidden = false;
    }
    openDialog(bookingDialog);
    window.setTimeout(() => dateInput.focus(), 100);
  }

  $$('[data-open-booking]').forEach(button => {
    button.addEventListener('click', () => showBooking(button.dataset.service || 'Поддерживающая уборка'));
  });
  $('#book-estimate').addEventListener('click', () => showBooking(serviceNames[currentEstimate.type], true));

  serviceSelect.addEventListener('change', () => {
    if (!summary.hidden && serviceSelect.value !== serviceNames[currentEstimate.type]) summary.hidden = true;
  });

  $$('.dialog-close', bookingDialog).forEach(button => button.addEventListener('click', () => closeDialog(bookingDialog)));
  $('#success-close').addEventListener('click', () => closeDialog(bookingDialog));

  [bookingDialog, $('#policy-dialog')].forEach(dialog => {
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const isOutside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
      if (isOutside) closeDialog(dialog);
    });
    dialog.addEventListener('cancel', () => document.body.classList.remove('dialog-open'));
  });

  phoneInput.addEventListener('input', () => {
    let digits = phoneInput.value.replace(/\D/g, '');
    if (!digits) {
      phoneInput.value = '';
      return;
    }
    if (digits[0] === '8') digits = `7${digits.slice(1)}`;
    if (digits[0] !== '7') digits = `7${digits}`;
    digits = digits.slice(0, 11);
    let formatted = '+7';
    if (digits.length > 1) formatted += ` ${digits.slice(1, 4)}`;
    if (digits.length >= 5) formatted += ` ${digits.slice(4, 7)}`;
    if (digits.length >= 8) formatted += `-${digits.slice(7, 9)}`;
    if (digits.length >= 10) formatted += `-${digits.slice(9, 11)}`;
    phoneInput.value = formatted;
  });

  function validateField(field) {
    let valid = field.checkValidity();
    if (field === phoneInput) valid = field.value.replace(/\D/g, '').length === 11;
    if (field === $('#booking-name')) valid = field.value.trim().length >= 2;
    const wrapper = field.closest('.form-field');
    if (wrapper) wrapper.classList.toggle('is-invalid', !valid);
    return valid;
  }

  $$('input[required], select[required]', bookingForm).forEach(field => {
    if (field.type === 'checkbox') return;
    field.addEventListener('blur', () => validateField(field));
    field.addEventListener('input', () => {
      if (field.closest('.form-field')?.classList.contains('is-invalid')) validateField(field);
    });
    field.addEventListener('change', () => validateField(field));
  });

  $('#booking-consent').addEventListener('change', event => {
    event.target.closest('.consent').classList.toggle('is-invalid', !event.target.checked);
  });

  bookingForm.addEventListener('submit', event => {
    event.preventDefault();
    const fields = $$('input[required], select[required]', bookingForm).filter(field => field.type !== 'checkbox');
    const fieldsValid = fields.map(validateField).every(Boolean);
    const consent = $('#booking-consent');
    consent.closest('.consent').classList.toggle('is-invalid', !consent.checked);
    if (!fieldsValid || !consent.checked) {
      const firstInvalid = $('.is-invalid input, .is-invalid select', bookingForm);
      firstInvalid?.focus();
      return;
    }

    const submitButton = $('.submit-button', bookingForm);
    submitButton.classList.add('is-loading');
    submitButton.disabled = true;
    $('span', submitButton).textContent = 'Отправляем…';

    window.setTimeout(() => {
      const formData = new FormData(bookingForm);
      const request = {
        service: formData.get('service'),
        date: formData.get('date'),
        time: formData.get('time'),
        name: formData.get('name').trim(),
        phone: formData.get('phone'),
        estimate: summary.hidden ? null : currentEstimate?.total,
        createdAt: new Date().toISOString()
      };
      try {
        const savedRequests = JSON.parse(localStorage.getItem('berezhno-requests') || '[]');
        savedRequests.push(request);
        localStorage.setItem('berezhno-requests', JSON.stringify(savedRequests.slice(-10)));
      } catch (_) {
      }

      const chosenDate = new Date(`${request.date}T12:00:00`);
      const formattedDate = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(chosenDate);
      $('#success-name').textContent = request.name;
      $('#success-date').textContent = `${formattedDate}, ${request.time}`;
      $('#success-phone').textContent = request.phone;
      bookingForm.hidden = true;
      bookingSuccess.hidden = false;
      submitButton.classList.remove('is-loading');
      submitButton.disabled = false;
      $('span', submitButton).textContent = 'Оставить заявку';
      bookingForm.reset();
    }, 650);
  });

  $$('.faq-list details').forEach(item => {
    item.addEventListener('toggle', () => {
      if (!item.open) return;
      $$('.faq-list details').forEach(other => {
        if (other !== item) other.open = false;
      });
    });
  });

  const policyDialog = $('#policy-dialog');
  $('[data-policy]').addEventListener('click', event => {
    event.preventDefault();
    openDialog(policyDialog);
  });
  $('.dialog-close', policyDialog).addEventListener('click', () => closeDialog(policyDialog));
  $('#policy-close').addEventListener('click', () => closeDialog(policyDialog));

  $('#current-year').textContent = new Date().getFullYear();
})();

/**
 * CryptoNavigator Landing Application Client Logic
 * Pure Vanilla JS - Zero External Dependencies
 */

document.addEventListener('DOMContentLoaded', () => {
  initRegistrationModal();
  initFaqAccordion();
  initOrderBookSimulator();
  initShowcaseTabs();
  initKryptikConsole();
  initSmoothScroll();
});

// Interactive Product Showcase Tabs
function initShowcaseTabs() {
  const tabs = document.querySelectorAll('.showcase-tab-btn');
  const panels = document.querySelectorAll('.showcase-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = tab.getAttribute('data-target');
      
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }
    });
  });
}

// Interactive Kryptik Terminal Console
function initKryptikConsole() {
  const btn1 = document.getElementById('kryptik-btn-1');
  const btn2 = document.getElementById('kryptik-btn-2');
  const reply1 = document.getElementById('kryptik-reply-1');
  const reply2 = document.getElementById('kryptik-reply-2');

  if (btn1 && reply1 && reply2) {
    btn1.addEventListener('click', () => {
      reply2.style.display = 'none';
      reply1.style.display = 'block';
    });
  }

  if (btn2 && reply1 && reply2) {
    btn2.addEventListener('click', () => {
      reply1.style.display = 'none';
      reply2.style.display = 'block';
    });
  }
}

// Modal Registration & Waitlist Handler
function initRegistrationModal() {
  const modal = document.getElementById('reg-modal');
  const openButtons = document.querySelectorAll('.js-open-reg');
  const closeButton = document.querySelector('.modal-close-btn');
  const form = document.getElementById('reg-form');
  const emailInput = document.getElementById('reg-email');
  const passInput = document.getElementById('reg-pass');
  const termsCheckbox = document.getElementById('reg-terms');
  
  const errEmail = document.getElementById('err-email');
  const errPass = document.getElementById('err-pass');
  const errTerms = document.getElementById('err-terms');
  const waitlistAlert = document.getElementById('waitlist-alert');
  const submitBtn = document.getElementById('reg-submit-btn');

  if (!modal || !form) return;

  function openModal() {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    if (emailInput) emailInput.focus();
  }

  function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  openButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openModal();
    });
  });

  if (closeButton) {
    closeButton.addEventListener('click', closeModal);
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeModal();
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    let hasError = false;

    // Reset error states
    if (errEmail) errEmail.style.display = 'none';
    if (errPass) errPass.style.display = 'none';
    if (errTerms) errTerms.style.display = 'none';
    if (waitlistAlert) waitlistAlert.style.display = 'none';

    // Email validation
    const emailVal = emailInput ? emailInput.value.trim() : '';
    if (!emailVal || !emailVal.includes('@') || !emailVal.includes('.')) {
      if (errEmail) errEmail.style.display = 'block';
      hasError = true;
    }

    // Password validation (min 8 chars)
    const passVal = passInput ? passInput.value : '';
    if (!passVal || passVal.length < 8) {
      if (errPass) errPass.style.display = 'block';
      hasError = true;
    }

    // Terms validation
    if (termsCheckbox && !termsCheckbox.checked) {
      if (errTerms) errTerms.style.display = 'block';
      hasError = true;
    }

    if (hasError) return;

    // Set loading state
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.dataset.origText = submitBtn.textContent;
      submitBtn.textContent = '...';
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailVal, password: passVal })
      });

      if (response.ok) {
        const data = await response.json();
        // Redirect to application with unlocked Phase 0
        window.location.href = '/index.html?welcome=phase0';
        return;
      } else {
        throw new Error('API offline');
      }
    } catch (err) {
      // Fallback: Honest waitlist confirmation
      try {
        localStorage.setItem('cn_waitlist_email', emailVal);
      } catch (storageErr) {
        // ignore localStorage limitation
      }
      
      if (waitlistAlert) {
        waitlistAlert.style.display = 'block';
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = submitBtn.dataset.origText || 'OK';
      }
    }
  });
}

// FAQ Accordion with Accessibility Support
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const questionBtn = item.querySelector('.faq-question');
    if (!questionBtn) return;

    questionBtn.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      
      // Close other items
      faqItems.forEach(other => {
        if (other !== item) {
          other.classList.remove('open');
          const otherBtn = other.querySelector('.faq-question');
          if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
        }
      });

      // Toggle current
      if (isOpen) {
        item.classList.remove('open');
        questionBtn.setAttribute('aria-expanded', 'false');
      } else {
        item.classList.add('open');
        questionBtn.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

// Interactive Order Book Simulator
function initOrderBookSimulator() {
  const simBuyBtn = document.getElementById('btn-sim-buy');
  const simSellBtn = document.getElementById('btn-sim-sell');
  const statusEl = document.getElementById('sim-status-msg');
  const spreadEl = document.getElementById('sim-spread-val');
  const detectorEl = document.getElementById('sim-detector-text');

  if (!simBuyBtn || !simSellBtn) return;

  const scenarios = [
    {
      spread: "0.02%",
      text: "Спред узкий (0.02%). Ликвидность плотная, проскальзывание минимально.",
      msgBuy: "Рыночный ордер на покупку исполнен по $64,200.00 без проскальзывания.",
      msgSell: "Рыночный ордер на продажу исполнен по $64,195.00 без проскальзывания."
    },
    {
      spread: "0.08%",
      text: "Крупная заявка в стакане на уровне $64,250. Сопротивление близко.",
      msgBuy: "Покупка исполнена. Плотность заявок продавца сдержала импульс цены.",
      msgSell: "Продажа исполнена в стакан покупателей с минимальной задержкой."
    },
    {
      spread: "0.01%",
      text: "Высокая концентрация маркет-мейкеров. Идеальные условия для алгоритмического бота.",
      msgBuy: "Ордер мгновенно сведён в пуле ликвидности.",
      msgSell: "Ордер сведён с лучшей заявкой на покупку."
    }
  ];

  let currentIdx = 0;

  function runSim(type) {
    currentIdx = (currentIdx + 1) % scenarios.length;
    const scenario = scenarios[currentIdx];

    if (spreadEl) spreadEl.textContent = scenario.spread;
    if (detectorEl) detectorEl.textContent = scenario.text;
    if (statusEl) {
      statusEl.textContent = type === 'buy' ? scenario.msgBuy : scenario.msgSell;
      statusEl.style.opacity = '1';
    }
  }

  simBuyBtn.addEventListener('click', () => runSim('buy'));
  simSellBtn.addEventListener('click', () => runSim('sell'));
}

// Smooth scrolling for anchor links
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#' || targetId.length <= 1) return;
      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        targetEl.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}

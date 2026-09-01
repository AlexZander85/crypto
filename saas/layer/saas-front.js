// saas-front.js — SaaS-слой (§6 промта v2.0). Заглушка Стадии 2: полная реализация — Стадия 3.
// Офлайн-инвариант: любая сеть/ошибка — тихо, продукт живёт как локальный v12.9.
(function () {
  'use strict';
  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }
  ready(function () {
    try { console.log('[saas-front] слой подключён, сборка ' + (window.CN_BUILD && window.CN_BUILD.app)); } catch (e) {}
  });
})();

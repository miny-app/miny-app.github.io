(function () {
  'use strict';

  var STORAGE_KEY = 'queue-check:count';

  var countEl = document.getElementById('count');
  var incrementBtn = document.getElementById('increment');
  var resetBtn = document.getElementById('reset');

  var count = loadCount();
  render();

  incrementBtn.addEventListener('click', function () {
    count += 1;
    save();
    render();
  });

  resetBtn.addEventListener('click', function () {
    count = 0;
    save();
    render();
  });

  function render() {
    countEl.textContent = String(count);
  }

  function loadCount() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var n = parseInt(raw, 10);
      return Number.isFinite(n) && n >= 0 ? n : 0;
    } catch (e) {
      // localStorage를 쓸 수 없는 환경이면 메모리에서만 동작한다.
      return 0;
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, String(count));
    } catch (e) {
      // 저장 실패 시 화면 동작은 그대로 유지한다.
    }
  }
})();

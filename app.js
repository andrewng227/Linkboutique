/**
 * BẢNG THEO DÕI GIỜ LÀM VÀ CHẤM CÔNG TỰ ĐỘNG
 * High-performance vanilla JavaScript with 3D Drum Roller Wheel Picker for "Thứ"
 */

const DAYS_OF_WEEK = [
  'Thứ Hai',
  'Thứ Ba',
  'Thứ Tư',
  'Thứ Năm',
  'Thứ Sáu',
  'Thứ Bảy',
  'Chủ nhật'
];

// Initial demo data matching the screenshot structure
const INITIAL_RECORDS = [
  { date: '2026-09-01', day: 'Thứ Ba', inTime: '08:00', outTime: '17:00' },
  { date: '2026-09-02', day: 'Thứ Tư', inTime: '08:00', outTime: '17:00' },
  { date: '2026-09-03', day: 'Thứ Năm', inTime: '08:00', outTime: '18:00' },
  { date: '2026-09-04', day: 'Thứ Sáu', inTime: '08:00', outTime: '17:00' },
  { date: '2026-09-05', day: 'Thứ Bảy', inTime: '08:00', outTime: '12:00' },
  { date: '2026-09-06', day: 'Chủ nhật', inTime: '', outTime: '' },
  { date: '2026-09-07', day: 'Thứ Hai', inTime: '08:00', outTime: '17:00' },
  { date: '2026-09-08', day: 'Thứ Ba', inTime: '08:00', outTime: '20:00' }, // 12h, 4h OT
  { date: '2026-09-09', day: 'Thứ Tư', inTime: '08:00', outTime: '17:00' },
  { date: '2026-09-10', day: 'Thứ Năm', inTime: '08:00', outTime: '17:00' },
  { date: '2026-09-11', day: 'Thứ Sáu', inTime: '08:00', outTime: '18:00' },
  { date: '2026-09-12', day: 'Thứ Bảy', inTime: '08:00', outTime: '12:00' },
  { date: '2026-09-13', day: 'Chủ nhật', inTime: '', outTime: '' },
  { date: '2026-09-14', day: 'Thứ Hai', inTime: '', outTime: '' },
  { date: '2026-09-15', day: 'Thứ Ba', inTime: '08:00', outTime: '17:30' },
];

class TimesheetApp {
  constructor() {
    this.records = [];
    this.activeRowIndex = null;

    // DOM Elements
    this.tableBody = document.getElementById('timesheetBody');
    this.employeeNameInput = document.getElementById('employeeName');
    this.workPeriodInput = document.getElementById('workPeriod');
    this.baseRateInput = document.getElementById('baseRate');

    // KPI Elements
    this.kpiTotalHours = document.getElementById('kpiTotalHours');
    this.kpiTotalSalary = document.getElementById('kpiTotalSalary');

    // Footer Elements
    this.footerTotalHours = document.getElementById('footerTotalHours');
    this.footerTotalSalary = document.getElementById('footerTotalSalary');

    // Action Buttons
    this.btnAddRow = document.getElementById('btnAddRow');
    this.btnBottomAddRow = document.getElementById('btnBottomAddRow');
    this.btnRestore = document.getElementById('btnRestore');
    this.btnReset = document.getElementById('btnReset');
    this.btnPrint = document.getElementById('btnPrint');
    this.toastEl = document.getElementById('toastNotification');

    // Wheel Picker Setup
    this.initWheelPicker();
    this.initEventListeners();
    this.loadState();
  }

  /* ------------------------------------------------------------------------
     STATE MANAGEMENT & LOCAL STORAGE
     ------------------------------------------------------------------------ */
  loadState() {
    try {
      const saved = localStorage.getItem('andrew_timesheet_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.employeeNameInput.value = parsed.employeeName || 'Andrew Nguyen';
        this.workPeriodInput.value = parsed.workPeriod || '2026-09';
        this.baseRateInput.value = parsed.baseRate || 30000;
        this.records = Array.isArray(parsed.records) ? parsed.records : INITIAL_RECORDS;
      } else {
        this.records = [...INITIAL_RECORDS];
      }
    } catch (e) {
      console.warn('Failed to parse localStorage, fallback to default', e);
      this.records = [...INITIAL_RECORDS];
    }
    this.render();
  }

  saveState() {
    const data = {
      employeeName: this.employeeNameInput.value,
      workPeriod: this.workPeriodInput.value,
      baseRate: parseFloat(this.baseRateInput.value) || 30000,
      records: this.records
    };
    try {
      localStorage.setItem('andrew_timesheet_data', JSON.stringify(data));
    } catch (e) {
      console.error('LocalStorage write error', e);
    }
  }

  /* ------------------------------------------------------------------------
     EVENT LISTENERS
     ------------------------------------------------------------------------ */
  initEventListeners() {
    // Config changes recalculate
    [
      this.employeeNameInput,
      this.workPeriodInput,
      this.baseRateInput
    ].forEach(input => {
      input.addEventListener('input', () => {
        this.recalculateAll();
        this.saveState();
      });
    });

    // Add new row (Top and Bottom buttons)
    if (this.btnAddRow) {
      this.btnAddRow.addEventListener('click', () => this.addNewRow());
    }
    if (this.btnBottomAddRow) {
      this.btnBottomAddRow.addEventListener('click', () => this.addNewRow());
    }

    // Reset data button
    this.btnReset.addEventListener('click', () => {
      this.resetData();
    });

    // Restore data button
    this.btnRestore.addEventListener('click', () => {
      this.restoreData();
    });

    // Print
    this.btnPrint.addEventListener('click', () => {
      window.print();
    });
  }

  addNewRow() {
    let nextDate;
    if (this.records.length > 0) {
      const lastDate = this.records[this.records.length - 1].date;
      nextDate = this.incrementDate(lastDate);
    } else {
      const ym = this.workPeriodInput.value || '2026-09';
      nextDate = `${ym}-01`;
    }
    const dayOfWeek = this.getDayOfWeekFromDate(nextDate);
    this.records.push({
      date: nextDate,
      day: dayOfWeek,
      inTime: '08:00',
      outTime: '17:00'
    });
    this.render();
    this.saveState();
    this.showToast('✅ Đã thêm ngày mới!');
  }

  /* ------------------------------------------------------------------------
     BACKUP & RESTORE UTILITIES
     ------------------------------------------------------------------------ */
  saveBackup() {
    const backupData = {
      timestamp: new Date().toISOString(),
      employeeName: this.employeeNameInput.value,
      workPeriod: this.workPeriodInput.value,
      baseRate: parseFloat(this.baseRateInput.value) || 30000,
      records: JSON.parse(JSON.stringify(this.records))
    };
    try {
      localStorage.setItem('andrew_timesheet_backup', JSON.stringify(backupData));
    } catch (e) {
      console.error('Backup write error', e);
    }
  }

  resetData() {
    const userConfirm = confirm(
      'Anh có muốn Đặt lại (XÓA TẤT CẢ các dòng) không?\n\n' +
      '• Toàn bộ dữ liệu hiện tại sẽ được TỰ ĐỘNG SAO LƯU.\n' +
      '• Anh có thể bấm nút "Khôi Phục" bất cứ lúc nào để lấy lại dữ liệu vừa xóa.'
    );
    if (!userConfirm) return;

    // Save backup first so user can restore anytime!
    this.saveBackup();

    // Clear all records completely!
    this.records = [];
    this.render();
    this.saveState();
    this.showToast('✨ Đã xóa tất cả các ngày! Bấm "+ Thêm Ngày Làm" để bắt đầu.');
  }

  restoreData() {
    try {
      const savedBackup = localStorage.getItem('andrew_timesheet_backup');
      if (savedBackup) {
        const backup = JSON.parse(savedBackup);
        
        // Save current as the new backup so user can undo/toggle back
        this.saveBackup();

        if (backup.employeeName) this.employeeNameInput.value = backup.employeeName;
        if (backup.workPeriod) this.workPeriodInput.value = backup.workPeriod;
        if (backup.baseRate) this.baseRateInput.value = backup.baseRate;
        if (Array.isArray(backup.records)) this.records = backup.records;

        this.render();
        this.saveState();
        this.showToast('✅ Đã khôi phục dữ liệu trước đó thành công!');
      } else {
        const resetToDefault = confirm(
          'Chưa có bản sao lưu gần nhất. Anh có muốn khôi phục về dữ liệu mẫu ban đầu không?'
        );
        if (resetToDefault) {
          this.saveBackup();
          this.records = JSON.parse(JSON.stringify(INITIAL_RECORDS));
          this.render();
          this.saveState();
          this.showToast('✅ Đã khôi phục về dữ liệu mẫu ban đầu!');
        }
      }
    } catch (e) {
      console.error('Error restoring data', e);
      alert('Không thể khôi phục dữ liệu: ' + e.message);
    }
  }

  showToast(message) {
    if (!this.toastEl) return;
    this.toastEl.textContent = message;
    this.toastEl.classList.add('show');
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.toastEl.classList.remove('show');
    }, 3200);
  }

  updateOtSubtitle() {
    const otMult = parseFloat(this.otMultiplierInput.value) || 1.5;
    this.otSubtitleLabel.textContent = `Tăng ca tính x${otMult}`;
  }

  incrementDate(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '2026-09-01';
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }

  getDayOfWeekFromDate(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Thứ Hai';
    const dayIndex = d.getDay(); // 0 is Sunday, 1 is Monday...
    const map = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    return map[dayIndex];
  }

  generateFullMonth() {
    const ym = this.workPeriodInput.value || '2026-09';
    const [year, month] = ym.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();

    const newRecords = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayName = this.getDayOfWeekFromDate(dateStr);
      const isWeekend = dayName === 'Chủ nhật';
      const isSaturday = dayName === 'Thứ Bảy';

      newRecords.push({
        date: dateStr,
        day: dayName,
        inTime: isWeekend ? '' : '08:00',
        outTime: isWeekend ? '' : (isSaturday ? '12:00' : '17:00')
      });
    }

    this.records = newRecords;
    this.render();
    this.saveState();
  }

  /* ------------------------------------------------------------------------
     24-HOUR TIME NORMALIZATION & PARSING
     ------------------------------------------------------------------------ */
  parseTimeToHours(timeStr) {
    if (!timeStr && timeStr !== 0) return null;
    let s = String(timeStr).trim();
    if (!s) return null;

    if (s.includes(':')) {
      const parts = s.split(':');
      const h = parseFloat(parts[0]);
      const m = parseFloat(parts[1]) || 0;
      if (isNaN(h)) return null;
      return h + (m / 60);
    }

    // Direct number e.g. "8", "17", "17.5"
    let val = parseFloat(s);
    if (isNaN(val)) return null;

    // Handle typing "830" -> 8:30, "1730" -> 17:30
    if (s.length === 3 && !s.includes('.')) {
      const h = parseFloat(s.slice(0, 1));
      const m = parseFloat(s.slice(1)) || 0;
      return h + (m / 60);
    }
    if (s.length === 4 && !s.includes('.')) {
      const h = parseFloat(s.slice(0, 2));
      const m = parseFloat(s.slice(2)) || 0;
      return h + (m / 60);
    }

    return val;
  }

  normalize24hTime(timeStr) {
    if (!timeStr) return '';
    let cleaned = timeStr.trim().replace(/[^0-9:]/g, '');
    if (!cleaned) return '';

    let hours = 0;
    let minutes = 0;

    if (cleaned.includes(':')) {
      const parts = cleaned.split(':');
      hours = parseInt(parts[0], 10) || 0;
      minutes = parseInt(parts[1], 10) || 0;
    } else {
      // Pure numbers like "8", "800", "0800", "17", "1730"
      if (cleaned.length <= 2) {
        hours = parseInt(cleaned, 10) || 0;
        minutes = 0;
      } else if (cleaned.length === 3) {
        // e.g. "830" -> 08:30
        hours = parseInt(cleaned.slice(0, 1), 10) || 0;
        minutes = parseInt(cleaned.slice(1), 10) || 0;
      } else {
        // e.g. "0830", "1730"
        hours = parseInt(cleaned.slice(0, 2), 10) || 0;
        minutes = parseInt(cleaned.slice(2, 4), 10) || 0;
      }
    }

    // Clamp to valid 24-hour format: 00..23 hours and 00..59 minutes
    hours = Math.max(0, Math.min(23, hours));
    minutes = Math.max(0, Math.min(59, minutes));

    const hh = String(hours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  /* ------------------------------------------------------------------------
     HOURS & SALARY CALCULATION: (Giờ Out - Giờ In) * Lương Giờ (30k)
     ------------------------------------------------------------------------ */
  calculateRow(record) {
    const inH = this.parseTimeToHours(record.inTime);
    const outH = this.parseTimeToHours(record.outTime);

    if (inH === null || outH === null || isNaN(inH) || isNaN(outH)) {
      return { totalHours: 0, salary: 0 };
    }

    let diff = outH - inH;
    if (diff < 0) {
      diff += 24; // Worked overnight past midnight
    }

    let rate = parseFloat(this.baseRateInput.value) || 30000;
    // If user enters shorthand like 30 (for 30k), treat as 30000
    if (rate > 0 && rate <= 100) {
      rate = rate * 1000;
    }

    const salary = diff * rate;

    return {
      totalHours: Math.round(diff * 10) / 10,
      salary: Math.round(salary)
    };
  }

  formatNumber(num, decimals = 1) {
    return num.toLocaleString('vi-VN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  formatCurrency(num) {
    return Math.round(num).toLocaleString('vi-VN') + ' đ';
  }

  /* ------------------------------------------------------------------------
     RENDER TABLE & STATS
     ------------------------------------------------------------------------ */
  render() {
    this.tableBody.innerHTML = '';

    if (this.records.length === 0) {
      this.tableBody.innerHTML = `
        <tr class="empty-state-row">
          <td colspan="7" class="text-center empty-state-cell">
            <div class="empty-state-content">
              <span class="empty-state-text">Bảng chấm công đang trống (Đã xóa tất cả)</span>
              <button type="button" class="btn btn-primary" id="btnEmptyAddRow">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                + Thêm Ngày Đầu Tiên
              </button>
            </div>
          </td>
        </tr>
      `;
      const btnEmpty = document.getElementById('btnEmptyAddRow');
      if (btnEmpty) {
        btnEmpty.addEventListener('click', () => this.addNewRow());
      }
      this.updateTotals();
      return;
    }

    let grandTotalHours = 0;
    let grandSalary = 0;

    this.records.forEach((record, index) => {
      const { totalHours, salary } = this.calculateRow(record);
      grandTotalHours += totalHours;
      grandSalary += salary;

      const isWeekend = record.day === 'Chủ nhật';
      const tr = document.createElement('tr');
      if (isWeekend) tr.classList.add('weekend-row');

      tr.innerHTML = `
        <td>
          <input type="date" class="cell-input date-input" value="${record.date}" data-index="${index}">
        </td>
        <td>
          <button type="button" class="day-picker-trigger ${isWeekend ? 'weekend-badge' : ''}" data-index="${index}">
            <span>${record.day || 'Chọn thứ'}</span>
            <svg class="scroll-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M7 15l5 5 5-5M7 9l5-5 5 5"/>
            </svg>
          </button>
        </td>
        <td>
          <div class="time-input-container">
            <input type="text" 
                   class="cell-input in-time-input mono-number text-center time-24h-input" 
                   value="${record.inTime || ''}" 
                   placeholder="08:00" 
                   maxlength="5" 
                   inputmode="numeric"
                   data-index="${index}">
          </div>
        </td>
        <td>
          <div class="time-input-container">
            <input type="text" 
                   class="cell-input out-time-input mono-number text-center time-24h-input" 
                   value="${record.outTime || ''}" 
                   placeholder="17:00" 
                   maxlength="5" 
                   inputmode="numeric"
                   data-index="${index}">
          </div>
        </td>
        <td class="text-center mono-number font-bold cell-total-hours">${this.formatNumber(totalHours, 1)}</td>
        <td class="text-center mono-number font-bold salary-cell cell-salary">${this.formatCurrency(salary)}</td>
        <td class="text-center no-print">
          <button type="button" class="btn-delete-row" title="Xóa dòng" data-index="${index}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </td>
      `;

      this.tableBody.appendChild(tr);
    });

    // Attach row events
    this.attachRowEvents();

    // Update KPI & Totals
    this.updateTotals();
  }

  updateRowMetrics(index) {
    const tr = this.tableBody.children[index];
    if (!tr) return;
    const record = this.records[index];
    const { totalHours, salary } = this.calculateRow(record);

    const cellTotalHours = tr.querySelector('.cell-total-hours');
    const cellSalary = tr.querySelector('.cell-salary');

    if (cellTotalHours) cellTotalHours.textContent = this.formatNumber(totalHours, 1);
    if (cellSalary) cellSalary.textContent = this.formatCurrency(salary);

    this.updateTotals();
  }

  updateTotals() {
    let grandTotalHours = 0;
    let grandSalary = 0;

    this.records.forEach(record => {
      const { totalHours, salary } = this.calculateRow(record);
      grandTotalHours += totalHours;
      grandSalary += salary;
    });

    const formattedHours = this.formatNumber(grandTotalHours, 1) + ' h';
    const formattedSalary = this.formatCurrency(grandSalary);

    this.kpiTotalHours.textContent = formattedHours;
    this.kpiTotalSalary.textContent = formattedSalary;

    this.footerTotalHours.textContent = formattedHours;
    this.footerTotalSalary.textContent = formattedSalary;
  }

  attachRowEvents() {
    // Day of week click triggers drum roller wheel picker
    this.tableBody.querySelectorAll('.day-picker-trigger').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(btn.dataset.index, 10);
        this.openWheelPicker(index);
      });
    });

    // Date change
    this.tableBody.querySelectorAll('.date-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const index = parseInt(input.dataset.index, 10);
        this.records[index].date = input.value;
        // Optionally update day of week automatically when date changes
        this.records[index].day = this.getDayOfWeekFromDate(input.value);
        this.render();
        this.saveState();
      });
    });

    // Setup 24h Time Inputs (In Time & Out Time)
    this.tableBody.querySelectorAll('.time-24h-input').forEach(input => {
      const updateRowLive = (isBlur = false) => {
        const index = parseInt(input.dataset.index, 10);
        const tr = this.tableBody.children[index];
        if (!tr) return;

        const inInput = tr.querySelector('.in-time-input');
        const outInput = tr.querySelector('.out-time-input');

        let inVal = inInput ? inInput.value.trim() : '';
        let outVal = outInput ? outInput.value.trim() : '';

        if (isBlur) {
          if (inInput && inVal) inInput.value = this.normalize24hTime(inVal);
          if (outInput && outVal) outInput.value = this.normalize24hTime(outVal);
          inVal = inInput ? inInput.value : '';
          outVal = outInput ? outInput.value : '';
        }

        this.records[index].inTime = inVal;
        this.records[index].outTime = outVal;

        // Smoothly update metrics for this row and overall totals live!
        this.updateRowMetrics(index);
        this.saveState();
      };

      // Auto-filter invalid characters during typing and update in real-time
      input.addEventListener('input', (e) => {
        let val = input.value.replace(/[^0-9:]/g, '');
        // Auto-add colon after 2 digits if typing forward
        if (val.length === 2 && !val.includes(':') && e.inputType !== 'deleteContentBackward') {
          val = val + ':';
        }
        input.value = val;
        updateRowLive(false);
      });

      input.addEventListener('keyup', () => {
        updateRowLive(false);
      });

      input.addEventListener('change', () => {
        updateRowLive(true);
      });

      // Press Enter to commit and blur
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          input.blur();
        }
      });

      // On Blur, validate and format strictly to 24h (HH:mm)
      input.addEventListener('blur', () => {
        updateRowLive(true);
      });
    });

    // Delete row
    this.tableBody.querySelectorAll('.btn-delete-row').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(btn.dataset.index, 10);
        this.records.splice(index, 1);
        this.render();
        this.saveState();
      });
    });
  }

  recalculateAll() {
    this.render();
  }

  /* ------------------------------------------------------------------------
     IOS DRUM ROLLER WHEEL PICKER IMPLEMENTATION
     ------------------------------------------------------------------------ */
  initWheelPicker() {
    this.wheelModal = document.getElementById('wheelPickerModal');
    this.wheelBackdrop = document.getElementById('wheelPickerBackdrop');
    this.wheelTrack = document.getElementById('wheelScrollTrack');
    this.btnConfirmWheel = document.getElementById('btnConfirmWheel');
    this.btnCancelWheel = document.getElementById('btnCancelWheel');

    this.itemHeight = 48; // px per item
    this.totalItems = DAYS_OF_WEEK.length;
    this.currentWheelIndex = 0;
    this.wheelOffset = 0; // translation Y

    // Populate wheel items
    this.wheelTrack.innerHTML = '';
    DAYS_OF_WEEK.forEach((day, i) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'wheel-item';
      itemEl.textContent = day;
      itemEl.dataset.index = i;
      itemEl.addEventListener('click', () => {
        this.scrollToIndex(i, true);
      });
      this.wheelTrack.appendChild(itemEl);
    });

    // Event listeners for dragging & scrolling
    this.initWheelTouchAndDrag();

    // Modal buttons
    this.btnConfirmWheel.addEventListener('click', () => this.confirmWheelSelection());
    this.btnCancelWheel.addEventListener('click', () => this.closeWheelPicker());
    this.wheelBackdrop.addEventListener('click', () => this.confirmWheelSelection());
  }

  initWheelTouchAndDrag() {
    let startY = 0;
    let currentY = 0;
    let isDragging = false;
    let startTime = 0;

    const onStart = (clientY) => {
      isDragging = true;
      startY = clientY;
      currentY = clientY;
      startTime = Date.now();
      this.wheelTrack.style.transition = 'none';
    };

    const onMove = (clientY) => {
      if (!isDragging) return;
      const deltaY = clientY - currentY;
      currentY = clientY;
      this.wheelOffset += deltaY;
      this.updateWheelVisuals();
    };

    const onEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      const elapsed = Date.now() - startTime;
      const totalDelta = currentY - startY;

      // Simple inertia
      if (elapsed < 300 && Math.abs(totalDelta) > 20) {
        const velocity = totalDelta / elapsed;
        this.wheelOffset += velocity * 120;
      }

      this.snapToNearest();
    };

    // Mouse events
    this.wheelTrack.addEventListener('mousedown', (e) => onStart(e.clientY));
    window.addEventListener('mousemove', (e) => onMove(e.clientY));
    window.addEventListener('mouseup', () => onEnd());

    // Touch events
    this.wheelTrack.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) onStart(e.touches[0].clientY);
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (isDragging && e.touches.length === 1) {
        onMove(e.touches[0].clientY);
      }
    }, { passive: true });

    window.addEventListener('touchend', () => onEnd());

    // Mouse wheel (scroll wheel on mouse)
    const viewport = document.querySelector('.wheel-viewport-container');
    viewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -this.itemHeight : this.itemHeight;
      this.wheelOffset += delta;
      this.snapToNearest(true);
    }, { passive: false });
  }

  updateWheelVisuals() {
    const centerOffset = (250 / 2) - (this.itemHeight / 2); // Center of viewport
    this.wheelTrack.style.transform = `translateY(${centerOffset + this.wheelOffset}px)`;

    const items = this.wheelTrack.querySelectorAll('.wheel-item');
    items.forEach((item, i) => {
      const itemCenter = i * this.itemHeight + this.wheelOffset;
      const distance = Math.abs(itemCenter);
      const normalizedDist = Math.min(distance / 120, 1.8);

      // 3D Cylinder curve calculation
      const rotateX = (-itemCenter / 120) * 45;
      const scale = Math.max(0.82, 1 - (normalizedDist * 0.12));
      const opacity = Math.max(0.25, 1 - (normalizedDist * 0.45));

      item.style.transform = `rotateX(${rotateX}deg) scale(${scale})`;
      item.style.opacity = opacity;

      if (distance < this.itemHeight / 2) {
        item.classList.add('selected');
        this.currentWheelIndex = i;
      } else {
        item.classList.remove('selected');
      }
    });
  }

  snapToNearest(smooth = true) {
    const minOffset = -((this.totalItems - 1) * this.itemHeight);
    const maxOffset = 0;

    let targetOffset = Math.round(this.wheelOffset / this.itemHeight) * this.itemHeight;
    targetOffset = Math.max(minOffset, Math.min(maxOffset, targetOffset));

    const targetIndex = Math.abs(Math.round(targetOffset / this.itemHeight));
    this.scrollToIndex(targetIndex, smooth);
  }

  scrollToIndex(index, smooth = true) {
    this.currentWheelIndex = Math.max(0, Math.min(this.totalItems - 1, index));
    this.wheelOffset = -this.currentWheelIndex * this.itemHeight;

    if (smooth) {
      this.wheelTrack.style.transition = 'transform 0.22s cubic-bezier(0.25, 1, 0.5, 1)';
    } else {
      this.wheelTrack.style.transition = 'none';
    }

    this.updateWheelVisuals();
  }

  openWheelPicker(rowIndex) {
    this.activeRowIndex = rowIndex;
    const currentDay = this.records[rowIndex]?.day || 'Thứ Hai';
    let idx = DAYS_OF_WEEK.indexOf(currentDay);
    if (idx === -1) idx = 0;

    this.wheelModal.classList.add('open');
    this.scrollToIndex(idx, false);

    // Trigger visual update after open
    requestAnimationFrame(() => {
      this.updateWheelVisuals();
    });
  }

  closeWheelPicker() {
    this.wheelModal.classList.remove('open');
    this.activeRowIndex = null;
  }

  confirmWheelSelection() {
    if (this.activeRowIndex !== null && this.records[this.activeRowIndex]) {
      const selectedDay = DAYS_OF_WEEK[this.currentWheelIndex];
      this.records[this.activeRowIndex].day = selectedDay;
      this.render();
      this.saveState();
    }
    this.closeWheelPicker();
  }
}

/* --------------------------------------------------------------------------
   SOOTHING SAKURA FALLING PETALS ANIMATION
   Natural physics, gentle breeze, 3D tumbling, zero-lag performance
   -------------------------------------------------------------------------- */
class SakuraPetals {
  constructor(canvasId = 'sakuraCanvas') {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.petals = [];
    this.animationFrameId = null;
    this.isRunning = true;

    // Palette of delicate sakura hues
    this.colors = [
      { r: 255, g: 192, b: 203 }, // Classic soft pink
      { r: 250, g: 218, b: 221 }, // Pale sakura milk
      { r: 248, g: 165, b: 194 }, // Rosy bloom
      { r: 251, g: 202, b: 215 }, // Sweet blush
      { r: 244, g: 143, b: 177 }  // Deep cherry blossom
    ];

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize(), { passive: true });

    // Adaptive petal count for optimal battery & performance
    const isMobile = window.innerWidth <= 768;
    const petalCount = isMobile ? 18 : 32;

    this.petals = [];
    for (let i = 0; i < petalCount; i++) {
      this.petals.push(this.createPetal(true));
    }

    // Visibility change handling (pause when tab is hidden to conserve power)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pause();
      } else {
        this.resume();
      }
    });

    this.animate();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  createPetal(randomY = false) {
    const colorObj = this.colors[Math.floor(Math.random() * this.colors.length)];
    const size = 10 + Math.random() * 12; // 10px to 22px

    return {
      x: Math.random() * this.width,
      y: randomY ? Math.random() * this.height : -size - Math.random() * 50,
      size: size,
      color: colorObj,
      opacity: 0.45 + Math.random() * 0.45,
      // Fall velocity (very gentle and soothing)
      speedY: 0.7 + Math.random() * 1.1,
      speedX: 0.3 + Math.random() * 0.8,
      // Oscillation and 3D tumbling angles
      angle: Math.random() * Math.PI * 2,
      angularSpeed: (Math.random() - 0.5) * 0.02,
      flip: Math.random() * Math.PI * 2,
      flipSpeed: 0.015 + Math.random() * 0.025,
      swayRadius: 0.8 + Math.random() * 1.5,
      swaySpeed: 0.01 + Math.random() * 0.02,
      swayOffset: Math.random() * Math.PI * 2
    };
  }

  drawPetal(p) {
    this.ctx.save();
    this.ctx.translate(p.x, p.y);
    this.ctx.rotate(p.angle);
    // 3D perspective flip
    this.ctx.scale(Math.sin(p.flip), 1);

    this.ctx.beginPath();
    // Organic heart/teardrop sakura petal with slight notch
    const s = p.size;
    this.ctx.moveTo(0, -s * 0.5);
    this.ctx.bezierCurveTo(s * 0.5, -s * 0.9, s * 0.9, -s * 0.2, s * 0.4, s * 0.5);
    this.ctx.bezierCurveTo(s * 0.1, s * 0.8, 0, s * 0.9, 0, s * 0.9);
    this.ctx.bezierCurveTo(0, s * 0.9, -s * 0.1, s * 0.8, -s * 0.4, s * 0.5);
    this.ctx.bezierCurveTo(-s * 0.9, -s * 0.2, -s * 0.5, -s * 0.9, 0, -s * 0.5);

    const { r, g, b } = p.color;
    // Gradient fill for soft glow
    const grad = this.ctx.createRadialGradient(0, 0, s * 0.1, 0, 0, s);
    grad.addColorStop(0, `rgba(${r + 15 > 255 ? 255 : r + 15}, ${g + 15 > 255 ? 255 : g + 15}, ${b + 15 > 255 ? 255 : b + 15}, ${p.opacity})`);
    grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${p.opacity * 0.75})`);

    this.ctx.fillStyle = grad;
    this.ctx.fill();
    this.ctx.restore();
  }

  update() {
    for (let i = 0; i < this.petals.length; i++) {
      const p = this.petals[i];

      p.y += p.speedY;
      p.swayOffset += p.swaySpeed;
      p.x += Math.sin(p.swayOffset) * p.swayRadius + p.speedX;
      p.angle += p.angularSpeed;
      p.flip += p.flipSpeed;

      // Wrap around when out of viewport
      if (p.y > this.height + p.size * 2 || p.x > this.width + p.size * 2 || p.x < -p.size * 2) {
        this.petals[i] = this.createPetal(false);
      }
    }
  }

  animate() {
    if (!this.isRunning) return;

    this.ctx.clearRect(0, 0, this.width, this.height);
    this.update();

    for (let i = 0; i < this.petals.length; i++) {
      this.drawPetal(this.petals[i]);
    }

    this.animationFrameId = requestAnimationFrame(() => this.animate());
  }

  pause() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  resume() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.animate();
    }
  }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  window.timesheetApp = new TimesheetApp();
  window.sakuraEffect = new SakuraPetals('sakuraCanvas');
});

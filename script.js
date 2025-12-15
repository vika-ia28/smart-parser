// Основной объект приложения
const SmartParser = {
    files: [],
    results: [],
    currentSection: 'upload',

    init() {
        console.log('SmartParser инициализирован');
        this.bindEvents();
        this.updateFileCount();
        this.showNotification('Система готова к работе', 'success');
    },

    bindEvents() {
        // Навигация
        document.querySelectorAll('.nav-link, .mobile-nav-link, .mobile-bottom-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('href').substring(1);
                this.switchSection(section);
            });
        });

        // Мобильное меню
        document.getElementById('mobileMenuBtn')?.addEventListener('click', () => {
            document.getElementById('mobileMenu').classList.add('active');
        });

        document.querySelector('.close-mobile-menu')?.addEventListener('click', () => {
            document.getElementById('mobileMenu').classList.remove('active');
        });

        // Загрузка файлов
        const fileInput = document.getElementById('fileInput');
        const dropZone = document.getElementById('dropZone');

        fileInput.addEventListener('change', (e) => this.handleFiles(e.target.files));

        // Drag & drop
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.add('dragover');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.remove('dragover');
            });
        });

        dropZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            this.handleFiles(files);
        });

        // Кнопки
        document.getElementById('parseBtn')?.addEventListener('click', () => this.startParsing());
        document.getElementById('clearBtn')?.addEventListener('click', () => this.clearAll());
        document.getElementById('clearAllBtn')?.addEventListener('click', () => this.clearFiles());
        document.getElementById('clearLogBtn')?.addEventListener('click', () => this.clearLog());

        // Фильтры на мобильных
        document.getElementById('filterToggle')?.addEventListener('click', () => {
            document.getElementById('filterButtons').classList.toggle('active');
        });

        // Экспорт
        document.querySelectorAll('.export-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const format = e.target.closest('.export-card').dataset.format;
                this.exportData(format);
            });
        });

        // Поиск в таблице
        document.getElementById('searchTable')?.addEventListener('input', (e) => {
            this.searchTable(e.target.value);
        });

        // Переключение чекбоксов
        document.getElementById('selectAll')?.addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('.file-select');
            checkboxes.forEach(cb => cb.checked = e.target.checked);
        });
    },

    switchSection(sectionId) {
        // Скрыть все секции
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });

        // Убрать active у всех ссылок
        document.querySelectorAll('.nav-link, .mobile-nav-link, .mobile-bottom-link').forEach(link => {
            link.classList.remove('active');
        });

        // Показать выбранную секцию
        document.getElementById(sectionId)?.classList.add('active');

        // Активировать соответствующие ссылки
        document.querySelectorAll(`[href="#${sectionId}"]`).forEach(link => {
            link.classList.add('active');
        });

        // Закрыть мобильное меню если открыто
        document.getElementById('mobileMenu')?.classList.remove('active');

        this.currentSection = sectionId;

        // Прокрутка к началу секции на мобильных
        if (window.innerWidth < 768) {
            document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
        }
    },

    handleFiles(fileList) {
        const newFiles = Array.from(fileList).map(file => ({
            id: Date.now() + Math.random(),
            file: file,
            name: file.name,
            size: this.formatFileSize(file.size),
            type: this.getFileType(file.name),
            status: 'waiting',
            progress: 0
        }));

        this.files = [...this.files, ...newFiles];
        this.updateFileList();
        this.updateFileCount();

        this.showNotification(`Добавлено ${newFiles.length} файлов`, 'success');
    },

    getFileType(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        if (['pdf'].includes(ext)) return 'PDF';
        if (['xls', 'xlsx'].includes(ext)) return 'Excel';
        if (['csv', 'txt'].includes(ext)) return 'CSV';
        if (['jpg', 'jpeg', 'png'].includes(ext)) return 'Image';
        return 'Other';
    },

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    updateFileList() {
        const filesList = document.getElementById('filesList');

        if (this.files.length === 0) {
            filesList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-cloud-upload-alt"></i>
                    <p>Файлы еще не добавлены</p>
                </div>
            `;
            return;
        }

        filesList.innerHTML = this.files.map(file => `
            <div class="file-item" data-id="${file.id}">
                <div class="file-info">
                    <i class="fas fa-file-${file.type.toLowerCase()} file-icon"></i>
                    <div class="file-details">
                        <h6>${file.name}</h6>
                        <p>${file.size} • ${file.type}</p>
                    </div>
                </div>
                <div class="file-actions">
                    <button class="file-btn" onclick="SmartParser.removeFile('${file.id}')" title="Удалить">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="file-btn" onclick="SmartParser.previewFile('${file.id}')" title="Предпросмотр">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </div>
        `).join('');
    },

    removeFile(fileId) {
        this.files = this.files.filter(f => f.id !== fileId);
        this.updateFileList();
        this.updateFileCount();
        this.showNotification('Файл удален', 'warning');
    },

    previewFile(fileId) {
        const file = this.files.find(f => f.id === fileId);
        if (file) {
            this.showNotification(`Предпросмотр: ${file.name}`, 'info');
        }
    },

    clearFiles() {
        this.files = [];
        this.updateFileList();
        this.updateFileCount();
        this.showNotification('Все файлы удалены', 'warning');
    },

    updateFileCount() {
        document.getElementById('fileCount').textContent = this.files.length;
    },

    async startParsing() {
        if (this.files.length === 0) {
            this.showNotification('Загрузите файлы для парсинга', 'warning');
            return;
        }

        this.switchSection('parse');
        this.showNotification('Начало парсинга документов', 'info');

        // Сброс прогресса
        this.updateProgress(0);
        this.updateStep(1);
        this.addLog('Начало обработки файлов', 'info');

        try {
            // Имитация обработки каждого файла
            for (let i = 0; i < this.files.length; i++) {
                const file = this.files[i];

                // Обновляем статус файла
                file.status = 'processing';
                file.progress = 0;
                this.updateFileList();

                // Имитация шагов обработки
                await this.simulateFileProcessing(file);

                // Обновляем общий прогресс
                const overallProgress = Math.round(((i + 1) / this.files.length) * 100);
                this.updateProgress(overallProgress);
                this.updateStep(Math.min(5, Math.floor(overallProgress / 20) + 1));
            }

            // Генерация результатов
            await this.generateResults();

            this.showNotification('Парсинг завершен успешно!', 'success');
            this.addLog('Обработка всех файлов завершена', 'success');

            // Переход к результатам
            setTimeout(() => {
                this.switchSection('results');
            }, 1000);

        } catch (error) {
            this.showNotification('Ошибка при обработке файлов', 'error');
            this.addLog(`Ошибка: ${error.message}`, 'error');
        }
    },

    async simulateFileProcessing(file) {
        const steps = [
            { name: 'Загрузка файла', duration: 500 },
            { name: 'Распознавание формата', duration: 800 },
            { name: 'Извлечение текста', duration: 1200 },
            { name: 'Парсинг данных', duration: 1500 },
            { name: 'Нормализация', duration: 1000 }
        ];

        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            await this.delay(step.duration);

            file.progress = ((i + 1) / steps.length) * 100;
            this.updateFileList();

            this.addLog(`${file.name}: ${step.name}`, 'info');
        }

        file.status = 'completed';
        file.progress = 100;
        this.updateFileList();

        this.addLog(`${file.name}: обработка завершена`, 'success');
    },

    async generateResults() {
        // Имитация извлеченных данных
        const sampleData = [
            { type: 'Номер документа', value: 'ИНВ-2024-001', confidence: '95%' },
            { type: 'Дата', value: '15.01.2024', confidence: '98%' },
            { type: 'Контрагент', value: 'ООО "Ромашка"', confidence: '92%' },
            { type: 'ИНН', value: '7701234567', confidence: '99%' },
            { type: 'Сумма', value: '45 000 ₽', confidence: '96%' },
            { type: 'НДС', value: '7 200 ₽', confidence: '90%' }
        ];

        // Обновляем предпросмотр
        const extractedData = document.getElementById('extractedData');
        extractedData.innerHTML = sampleData.map(item => `
            <tr>
                <td><span class="data-type">${item.type}</span></td>
                <td><strong>${item.value}</strong></td>
                <td><span class="confidence-badge" style="background: ${this.getConfidenceColor(item.confidence)}">
                    ${item.confidence}
                </span></td>
            </tr>
        `).join('');

        // Генерируем таблицу результатов
        this.results = Array.from({ length: 8 }, (_, i) => ({
            id: i + 1,
            document: `Документ ${i + 1}.pdf`,
            date: `2024-01-${String(i + 10).padStart(2, '0')}`,
            counterparty: ['ООО "Ромашка"', 'ИП Иванов', 'АО "Сбербанк"', 'ООО "Газпром"'][i % 4],
            inn: `77${String(1000000 + i).slice(1)}`,
            amount: (Math.random() * 100000).toFixed(2),
            vat: (Math.random() * 20000).toFixed(2),
            type: ['PDF', 'Excel', 'CSV'][i % 3],
            status: ['Успешно', 'Частично', 'Ошибка'][i % 3]
        }));

        this.updateResultsTable();
        this.updateStats();
    },

    updateResultsTable() {
        const tbody = document.getElementById('resultsTableBody');

        if (this.results.length === 0) {
            tbody.innerHTML = `
                <tr class="placeholder">
                    <td colspan="10">
                        <div class="placeholder-content">
                            <i class="fas fa-database"></i>
                            <p>Данные появятся здесь после парсинга</p>
                            <small>Загрузите документы и начните парсинг</small>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.results.map(item => `
            <tr>
                <td><input type="checkbox" class="file-select"></td>
                <td>${item.id}</td>
                <td>
                    <div class="document-cell">
                        <i class="fas fa-file-${item.type.toLowerCase()}"></i>
                        <span>${item.document}</span>
                    </div>
                </td>
                <td>${item.date}</td>
                <td>${item.counterparty}</td>
                <td class="mobile-hide">${item.inn}</td>
                <td><strong>${parseFloat(item.amount).toLocaleString('ru-RU')} ₽</strong></td>
                <td class="mobile-hide">${item.type}</td>
                <td>
                    <span class="status-badge status-${item.status === 'Успешно' ? 'success' : item.status === 'Частично' ? 'warning' : 'error'}">
                        ${item.status}
                    </span>
                </td>
                <td>
                    <button class="table-action-btn" title="Просмотр">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="table-action-btn" title="Скачать">
                        <i class="fas fa-download"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    },

    updateStats() {
        const totalSum = this.results.reduce((sum, item) => sum + parseFloat(item.amount), 0);
        const counterparties = new Set(this.results.map(item => item.counterparty));

        document.getElementById('totalDocs').textContent = this.results.length;
        document.getElementById('totalSum').textContent = totalSum.toLocaleString('ru-RU') + ' ₽';
        document.getElementById('totalCounterparties').textContent = counterparties.size;
        document.getElementById('processingTime').textContent = `${this.files.length * 2}с`;
    },

    searchTable(query) {
        const rows = document.querySelectorAll('#resultsTableBody tr:not(.placeholder)');
        const lowerQuery = query.toLowerCase();

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(lowerQuery) ? '' : 'none';
        });
    },

    exportData(format) {
        if (this.results.length === 0) {
            this.showNotification('Нет данных для экспорта', 'warning');
            return;
        }

        this.showNotification(`Подготовка экспорта в ${format.toUpperCase()}...`, 'info');

        // Имитация экспорта
        setTimeout(() => {
            const filename = `export-${new Date().toISOString().slice(0, 10)}.${format}`;
            const blob = new Blob([JSON.stringify(this.results, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showNotification(`Экспорт в ${format.toUpperCase()} завершен`, 'success');
        }, 1500);
    },

    updateProgress(percent) {
        document.getElementById('progressFill').style.width = `${percent}%`;
        document.getElementById('progressPercent').textContent = `${percent}%`;
    },

    updateStep(stepNumber) {
        document.querySelectorAll('.step').forEach((step, index) => {
            if (index + 1 <= stepNumber) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });
    },

    addLog(message, type = 'info') {
        const logContent = document.getElementById('logContent');
        const time = new Date().toLocaleTimeString('ru-RU', { hour12: false });

        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        logEntry.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'times-circle' : 'info-circle'}"></i>
            <span>${message}</span>
            <span class="log-time">${time}</span>
        `;

        logContent.prepend(logEntry);

        // Ограничиваем количество записей
        const entries = logContent.querySelectorAll('.log-entry');
        if (entries.length > 20) {
            entries[entries.length - 1].remove();
        }
    },

    clearLog() {
        document.getElementById('logContent').innerHTML = `
            <div class="log-entry success">
                <i class="fas fa-check-circle"></i>
                <span>Лог очищен. Система готова к работе.</span>
                <span class="log-time">${new Date().toLocaleTimeString('ru-RU', { hour12: false })}</span>
            </div>
        `;
    },

    clearAll() {
        this.clearFiles();
        this.results = [];
        this.updateResultsTable();
        this.updateStats();
        this.clearLog();
        this.updateProgress(0);
        this.updateStep(1);

        const extractedData = document.getElementById('extractedData');
        extractedData.innerHTML = `
            <tr class="empty-data">
                <td colspan="3">
                    <i class="fas fa-database"></i>
                    <p>После парсинга здесь появятся извлеченные данные</p>
                </td>
            </tr>
        `;

        this.showNotification('Все данные очищены', 'info');
    },

    getConfidenceColor(confidence) {
        const percent = parseInt(confidence);
        if (percent >= 90) return '#2ecc71';
        if (percent >= 70) return '#f39c12';
        return '#e74c3c';
    },

    showNotification(message, type = 'info') {
        const container = document.getElementById('notificationContainer');
        const id = Date.now();

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.id = `notification-${id}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'times-circle' : 'info-circle'}"></i>
            <div class="notification-content">
                <h4>${type === 'success' ? 'Успешно' : type === 'error' ? 'Ошибка' : 'Информация'}</h4>
                <p>${message}</p>
            </div>
        `;

        container.appendChild(notification);

        // Автоудаление через 5 секунд
        setTimeout(() => {
            const notif = document.getElementById(`notification-${id}`);
            if (notif) {
                notif.style.opacity = '0';
                notif.style.transform = 'translateX(100%)';
                setTimeout(() => notif.remove(), 300);
            }
        }, 5000);
    },

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    SmartParser.init();

    // Фикс для iOS
    if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
        document.body.classList.add('ios-device');
    }

    // Фикс высоты на мобильных
    function setVH() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }

    setVH();
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', setVH);
});

// Глобальные функции для обработчиков onclick
window.SmartParser = SmartParser;
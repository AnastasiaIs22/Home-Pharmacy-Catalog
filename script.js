let currentFilter = 'all';
let medicines = [];

// Загрузка лекарств
async function loadMedicines() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

        const { data, error } = await supabase
            .from('medicines')
            .select('*')
            .eq('user_id', user.id)
            .order('expiration_date', { ascending: true });

        if (error) throw error;

        medicines = data || [];
        updateStatistics();
        displayMedicines();
        checkExpirationDates();
    } catch (error) {
        console.error('Ошибка загрузки лекарств:', error.message);
        showMessage('Ошибка загрузки данных', 'error');
    }
}

// Добавление лекарства
async function addMedicine(medicineData) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) throw new Error('Пользователь не авторизован');

        const { data, error } = await supabase
            .from('medicines')
            .insert([{
                user_id: user.id,
                name: medicineData.name,
                expiration_date: medicineData.expiration_date,
                quantity: medicineData.quantity || 1,
                notes: medicineData.notes || ''
            }])
            .select();

        if (error) throw error;

        medicines.push(data[0]);
        updateStatistics();
        displayMedicines();
        showMessage('Лекарство успешно добавлено!', 'success');
        document.getElementById('addMedicineForm').reset();
        
        // Проверяем срок годности нового лекарства
        checkExpirationDates();
        
        return data[0];
    } catch (error) {
        console.error('Ошибка добавления лекарства:', error.message);
        showMessage('Ошибка добавления лекарства: ' + error.message, 'error');
        throw error;
    }
}

// Удаление лекарства
async function deleteMedicine(id) {
    try {
        const { error } = await supabase
            .from('medicines')
            .delete()
            .eq('id', id);

        if (error) throw error;

        medicines = medicines.filter(medicine => medicine.id !== id);
        updateStatistics();
        displayMedicines();
        showMessage('Лекарство удалено', 'success');
        
        // Проверяем остальные лекарства
        checkExpirationDates();
    } catch (error) {
        console.error('Ошибка удаления лекарства:', error.message);
        showMessage('Ошибка удаления лекарства', 'error');
    }
}

// Отображение лекарств
function displayMedicines() {
    const medicinesList = document.getElementById('medicinesList');
    if (!medicinesList) return;

    let filteredMedicines = medicines;

    // Применяем фильтр
    if (currentFilter === 'expiring') {
        const today = new Date();
        const oneMonthLater = new Date();
        oneMonthLater.setMonth(today.getMonth() + 1);
        
        filteredMedicines = medicines.filter(medicine => {
            const expDate = new Date(medicine.expiration_date);
            return expDate >= today && expDate <= oneMonthLater;
        });
    } else if (currentFilter === 'expired') {
        const today = new Date();
        filteredMedicines = medicines.filter(medicine => {
            return new Date(medicine.expiration_date) < today;
        });
    }

    if (filteredMedicines.length === 0) {
        medicinesList.innerHTML = `
            <div class="empty-state">
                <p>${currentFilter === 'all' ? 'Ваша аптечка пуста. Добавьте первое лекарство!' : 
                    currentFilter === 'expiring' ? 'Нет лекарств, срок годности которых истекает в течение месяца' : 
                    'Нет просроченных лекарств'}</p>
            </div>
        `;
        return;
    }

    medicinesList.innerHTML = filteredMedicines.map(medicine => {
        const expDate = new Date(medicine.expiration_date);
        const today = new Date();
        const timeDiff = expDate.getTime() - today.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        let statusClass = 'normal';
        let statusText = `Истекает через ${daysDiff} дней`;
        
        if (daysDiff <= 0) {
            statusClass = 'danger';
            statusText = `Просрочено ${Math.abs(daysDiff)} дней назад`;
        } else if (daysDiff <= 30) {
            statusClass = 'warning';
            statusText = `Истекает через ${daysDiff} дней`;
        }
        
        return `
            <div class="medicine-card ${statusClass}" data-id="${medicine.id}">
                <div class="medicine-info">
                    <h3 class="medicine-name">${escapeHtml(medicine.name)}</h3>
                    ${medicine.notes ? `<p class="medicine-notes">${escapeHtml(medicine.notes)}</p>` : ''}
                    <div class="medicine-details">
                        <div class="medicine-detail">
                            <span>📅 Срок годности:</span>
                            <strong>${formatDate(medicine.expiration_date)}</strong>
                        </div>
                        <div class="medicine-detail">
                            <span>📦 Количество:</span>
                            <strong>${medicine.quantity} шт.</strong>
                        </div>
                        <div class="medicine-detail">
                            <span>⏰ Статус:</span>
                            <span class="expiration-date ${statusClass}">${statusText}</span>
                        </div>
                    </div>
                </div>
                <div class="medicine-actions">
                    <button class="delete-btn" onclick="confirmDelete(${medicine.id})">🗑️ Удалить</button>
                </div>
            </div>
        `;
    }).join('');
}

// Фильтрация лекарств
function filterMedicines(filter) {
    currentFilter = filter;
    
    // Обновляем активную кнопку
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`show${filter.charAt(0).toUpperCase() + filter.slice(1)}Btn`).classList.add('active');
    
    displayMedicines();
}

// Обновление статистики
function updateStatistics() {
    const today = new Date();
    const oneMonthLater = new Date();
    oneMonthLater.setMonth(today.getMonth() + 1);
    
    const total = medicines.length;
    const expiring = medicines.filter(medicine => {
        const expDate = new Date(medicine.expiration_date);
        return expDate >= today && expDate <= oneMonthLater;
    }).length;
    
    const expired = medicines.filter(medicine => {
        return new Date(medicine.expiration_date) < today;
    }).length;
    
    document.getElementById('totalCount').textContent = total;
    document.getElementById('expiringCount').textContent = expiring;
    document.getElementById('expiredCount').textContent = expired;
}

// Проверка сроков годности
function checkExpirationDates() {
    const today = new Date();
    const expiringMedicines = medicines.filter(medicine => {
        const expDate = new Date(medicine.expiration_date);
        const timeDiff = expDate.getTime() - today.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        return daysDiff <= 30 && daysDiff >= 0;
    });
    
    const expiredMedicines = medicines.filter(medicine => {
        return new Date(medicine.expiration_date) < today;
    });
    
    // Здесь можно добавить логику для показа уведомлений
    if (expiredMedicines.length > 0) {
        console.log(`Найдено ${expiredMedicines.length} просроченных лекарств`);
    }
    
    if (expiringMedicines.length > 0) {
        console.log(`Найдено ${expiringMedicines.length} лекарств, срок годности которых истекает в течение месяца`);
    }
}

// Подтверждение удаления
function confirmDelete(id) {
    const modal = document.getElementById('confirmModal');
    const medicine = medicines.find(m => m.id === id);
    
    if (medicine) {
        document.getElementById('modalMessage').textContent = 
            `Вы уверены, что хотите удалить лекарство "${medicine.name}"?`;
    }
    
    modal.classList.add('show');
    
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    const cancelBtn = document.getElementById('cancelDeleteBtn');
    
    const handleConfirm = () => {
        deleteMedicine(id);
        modal.classList.remove('show');
        confirmBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click', handleCancel);
    };
    
    const handleCancel = () => {
        modal.classList.remove('show');
        confirmBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click', handleCancel);
    };
    
    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
    
    // Закрытие при клике вне модального окна
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.classList.remove('show');
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
        }
    });
}

// Вспомогательные функции
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showMessage(text, type) {
    // Создаем временное сообщение
    const message = document.createElement('div');
    message.className = `message ${type}`;
    message.textContent = text;
    message.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
        animation: fadeIn 0.3s ease-out;
    `;
    
    document.body.appendChild(message);
    
    setTimeout(() => {
        message.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(message);
        }, 300);
    }, 3000);
}

// Инициализация формы добавления лекарства
document.addEventListener('DOMContentLoaded', function() {
    const addForm = document.getElementById('addMedicineForm');
    
    if (addForm) {
        // Устанавливаем минимальную дату (сегодня)
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('expirationDate').min = today;
        
        addForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const name = document.getElementById('medicineName').value.trim();
            const expirationDate = document.getElementById('expirationDate').value;
            const quantity = parseInt(document.getElementById('quantity').value) || 1;
            const notes = document.getElementById('notes').value.trim();
            
            if (!name || !expirationDate) {
                showMessage('Заполните обязательные поля', 'error');
                return;
            }
            
            try {
                await addMedicine({
                    name,
                    expiration_date: expirationDate,
                    quantity,
                    notes
                });
            } catch (error) {
                // Ошибка уже обработана в addMedicine
            }
        });
    }
});

// Экспорт функций
window.loadMedicines = loadMedicines;
window.addMedicine = addMedicine;
window.deleteMedicine = deleteMedicine;
window.filterMedicines = filterMedicines;
window.confirmDelete = confirmDelete;

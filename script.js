// DOM Elements
const addTaskBtn = document.getElementById('add-task-btn');
const modalOverlay = document.getElementById('modal-overlay');
const taskModal = document.getElementById('task-modal');
const closeModal = document.getElementById('close-modal');
const cancelBtn = document.getElementById('cancel-btn');
const saveTaskBtn = document.getElementById('save-task-btn');
const taskInput = document.getElementById('task-input');
const dueDateInput = document.getElementById('due-date');
const tasksContainer = document.getElementById('tasks-container');
const dueDatesList = document.getElementById('due-dates-list');
const totalTasksEl = document.getElementById('total-tasks');
const completedTasksEl = document.getElementById('completed-tasks');
const modalTitle = document.getElementById('modal-title');
const priorityOptions = document.querySelectorAll('.priority-option');

// Task array to store all tasks
let tasks = [];
let editingTaskId = null;

// Set today's date as default
const today = new Date().toISOString().split('T')[0];
dueDateInput.value = today;

// Event Listeners
addTaskBtn.addEventListener('click', () => openModal());
closeModal.addEventListener('click', () => closeModalFunc());
cancelBtn.addEventListener('click', () => closeModalFunc());
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModalFunc();
});

// Priority selection
priorityOptions.forEach(option => {
    option.addEventListener('click', () => {
        priorityOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
    });
});

// Save task
saveTaskBtn.addEventListener('click', saveTask);

// Initialize the app
function init() {
    loadTasksFromStorage();
    renderTasks();
    updateStats();
}

// Open modal for adding/editing task
function openModal(taskId = null) {
    editingTaskId = taskId;
    
    if (taskId) {
        // Editing existing task
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            modalTitle.textContent = 'Edit Task';
            taskInput.value = task.text;
            dueDateInput.value = task.dueDate;
            
            // Select the correct priority
            priorityOptions.forEach(option => {
                if (option.dataset.value === task.priority) {
                    option.classList.add('selected');
                } else {
                    option.classList.remove('selected');
                }
            });
            
            saveTaskBtn.textContent = 'Update Task';
        }
    } else {
        // Adding new task
        modalTitle.textContent = 'Add New Task';
        taskInput.value = '';
        dueDateInput.value = today;
        
        // Select first priority by default
        priorityOptions.forEach((option, index) => {
            if (index === 0) {
                option.classList.add('selected');
            } else {
                option.classList.remove('selected');
            }
        });
        
        saveTaskBtn.textContent = 'Add Task';
    }
    
    modalOverlay.style.display = 'flex';
    taskInput.focus();
}

// Close modal
function closeModalFunc() {
    modalOverlay.style.display = 'none';
    editingTaskId = null;
}

// Save or update task
function saveTask() {
    const taskText = taskInput.value.trim();
    const dueDate = dueDateInput.value;
    const selectedPriority = document.querySelector('.priority-option.selected');
    
    if (!taskText) {
        alert('Please enter a task description!');
        return;
    }
    
    if (!dueDate) {
        alert('Please select a due date!');
        return;
    }
    
    if (!selectedPriority) {
        alert('Please select a priority!');
        return;
    }
    
    const priority = selectedPriority.dataset.value;
    
    if (editingTaskId) {
        // Update existing task
        const taskIndex = tasks.findIndex(t => t.id === editingTaskId);
        if (taskIndex !== -1) {
            tasks[taskIndex].text = taskText;
            tasks[taskIndex].priority = priority;
            tasks[taskIndex].dueDate = dueDate;
        }
    } else {
        // Create new task
        const task = {
            id: Date.now(),
            text: taskText,
            priority: priority,
            dueDate: dueDate,
            completed: false,
            createdAt: new Date().toISOString()
        };
        
        tasks.push(task);
    }
    
    saveTasksToStorage();
    renderTasks();
    updateStats();
    closeModalFunc();
}

// Render tasks in the to-do list
function renderTasks() {
    // Sort tasks: incomplete first, then by priority, then by due date
    const sortedTasks = [...tasks].sort((a, b) => {
        if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
        }
        
        const priorityOrder = { 'A': 1, 'B': 2, 'C': 3, 'D': 4 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        
        return new Date(a.dueDate) - new Date(b.dueDate);
    });
    
    if (sortedTasks.length === 0) {
        tasksContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard-list"></i>
                <h3>No tasks yet</h3>
                <p>Add your first task to get started!</p>
            </div>
        `;
    } else {
        tasksContainer.innerHTML = sortedTasks.map(task => `
            <div class="task-item ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
                <div class="task-header">
                    <div class="task-content">
                        <div class="task-text">${task.text}</div>
                        <div class="task-meta">
                            <span class="task-priority priority-${task.priority.toLowerCase()}">
                                Priority ${task.priority}
                            </span>
                            <span class="task-due-date">
                                <i class="far fa-calendar"></i> Due: ${formatDate(task.dueDate)}
                            </span>
                        </div>
                    </div>
                    <div class="task-actions">
                        <button class="action-btn complete-btn" onclick="toggleTaskCompletion(${task.id})">
                            <i class="fas fa-${task.completed ? 'undo' : 'check'}"></i>
                        </button>
                        <button class="action-btn edit-btn" onclick="openModal(${task.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete-btn" onclick="deleteTask(${task.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    updatePrioritySection();
    updateDueDates();
}

// Update the priority section on the left
function updatePrioritySection() {
    // Clear existing priority tasks
    document.querySelectorAll('.priority-task-list').forEach(ul => {
        ul.innerHTML = '';
    });
    
    // Group tasks by priority (only incomplete tasks)
    const priorityGroups = {
        A: [],
        B: [],
        C: [],
        D: []
    };
    
    tasks.forEach(task => {
        if (!task.completed && priorityGroups[task.priority]) {
            priorityGroups[task.priority].push(task);
        }
    });
    
    // Add tasks to their respective priority groups
    for (const priority in priorityGroups) {
        const groupElement = document.getElementById(`priority-${priority.toLowerCase()}-tasks`).querySelector('.priority-task-list');
        
        if (priorityGroups[priority].length === 0) {
            groupElement.innerHTML = '<li class="priority-task-item empty">No tasks</li>';
        } else {
            groupElement.innerHTML = priorityGroups[priority].map(task => `
                <li class="priority-task-item">
                    <span class="task-text">${task.text}</span>
                    <span class="due-date">${formatDate(task.dueDate)}</span>
                </li>
            `).join('');
        }
    }
}

// Update the due dates section
function updateDueDates() {
    dueDatesList.innerHTML = '';
    
    // Get unique due dates from incomplete tasks
    const uniqueDueDates = [...new Set(
        tasks
            .filter(task => !task.completed)
            .map(task => task.dueDate)
    )].sort();
    
    if (uniqueDueDates.length === 0) {
        dueDatesList.innerHTML = '<p style="text-align: center; opacity: 0.7;">No upcoming tasks</p>';
        return;
    }
    
    uniqueDueDates.forEach(date => {
        // Get tasks for this due date
        const tasksForDate = tasks.filter(task => 
            task.dueDate === date && !task.completed
        );
        
        if (tasksForDate.length > 0) {
            const dateGroup = document.createElement('div');
            dateGroup.classList.add('date-group');
            
            const dateHeader = document.createElement('div');
            dateHeader.classList.add('date-header');
            dateHeader.textContent = formatDate(date);
            
            dateGroup.appendChild(dateHeader);
            
            tasksForDate.forEach(task => {
                const taskElement = document.createElement('div');
                taskElement.classList.add('task-for-date');
                taskElement.innerHTML = `
                    <span class="task-text">${task.text}</span>
                    <span class="priority-badge priority-${task.priority.toLowerCase()}">${task.priority}</span>
                `;
                dateGroup.appendChild(taskElement);
            });
            
            dueDatesList.appendChild(dateGroup);
        }
    });
}

// Toggle task completion
function toggleTaskCompletion(taskId) {
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    if (taskIndex !== -1) {
        tasks[taskIndex].completed = !tasks[taskIndex].completed;
        saveTasksToStorage();
        renderTasks();
        updateStats();
    }
}

// Delete a task
function deleteTask(taskId) {
    if (confirm('Are you sure you want to delete this task?')) {
        tasks = tasks.filter(task => task.id !== taskId);
        saveTasksToStorage();
        renderTasks();
        updateStats();
    }
}

// Update statistics
function updateStats() {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.completed).length;
    
    totalTasksEl.textContent = `${totalTasks} ${totalTasks === 1 ? 'task' : 'tasks'}`;
    completedTasksEl.textContent = `${completedTasks} completed`;
}

// Helper function to format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Save tasks to localStorage
function saveTasksToStorage() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

// Load tasks from localStorage
function loadTasksFromStorage() {
    const storedTasks = localStorage.getItem('tasks');
    if (storedTasks) {
        tasks = JSON.parse(storedTasks);
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', init);
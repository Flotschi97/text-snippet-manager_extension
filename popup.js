document.addEventListener('DOMContentLoaded', () => {
    const addSnippetBtn = document.getElementById('addSnippetBtn');
    const snippetTitleInput = document.getElementById('snippetTitle');
    const snippetContentInput = document.getElementById('snippetContent');
    const snippetCategoryInput = document.getElementById('snippetCategory');
    const snippetList = document.getElementById('snippetList');
    const categoryFilter = document.getElementById('categoryFilter');
    const toggleInputBtn = document.getElementById('toggleInputBtn');
    const inputSection = document.getElementById('inputSection');
    const notification = document.getElementById('notification');

    let currentFilterCategory = 'all';
    let draggedItem = null; 
    
    // NEU: Hält die ID des Snippets, das gerade bearbeitet wird
    let editingSnippetId = null; 


    // Funktion zum Speichern eines Snippets (Neu oder Bearbeitet)
    function saveSnippet(title, content, category) {
        if (editingSnippetId) {
            // Wenn eine ID gesetzt ist, speichern wir die Bearbeitung
            saveEditedSnippet(editingSnippetId, title, content, category);
            editingSnippetId = null; // Bearbeitungsmodus beenden
            addSnippetBtn.textContent = 'Add template'; // Button-Text zurücksetzen
        } else {
            // Ansonsten speichern wir ein neues Snippet
            const id = Date.now().toString(); 
            const newSnippet = { id, title, content, category };
            
            chrome.storage.local.get('snippets', (data) => {
                const snippets = data.snippets || [];
                snippets.unshift(newSnippet);
                chrome.storage.local.set({ snippets }, () => {
                    saveLastCategory(category); 
                    renderSnippets();
                });
            });
        }
    }

    // NEU: Funktion zum Speichern eines BEARBEITETEN Snippets
    function saveEditedSnippet(id, title, content, category) {
        chrome.storage.local.get('snippets', (data) => {
            let snippets = data.snippets || [];
            const index = snippets.findIndex(s => s.id === id);
            
            if (index !== -1) {
                snippets[index].title = title;
                snippets[index].content = content;
                snippets[index].category = category;
                
                chrome.storage.local.set({ snippets }, () => {
                    renderSnippets();
                });
            }
        });
    }

    // NEU: Funktion zum Starten des Bearbeitungsmodus
    function editSnippet(id) {
        chrome.storage.local.get('snippets', (data) => {
            const snippet = (data.snippets || []).find(s => s.id === id);
            
            if (snippet) {
                // 1. Input-Sektion anzeigen
                inputSection.classList.remove('hidden');
                toggleInputBtn.textContent = 'Hide input';
                
                // 2. Felder füllen
                snippetTitleInput.value = snippet.title;
                snippetContentInput.value = snippet.content;
                snippetCategoryInput.value = snippet.category;
                
                // 3. ID des zu bearbeitenden Snippets speichern
                editingSnippetId = id;
                
                // 4. Button-Text anpassen
                addSnippetBtn.textContent = 'Save changes'; 
            }
        });
    }

    // Funktion zum Löschen eines Snippets
    function deleteSnippet(id) {
        chrome.storage.local.get('snippets', (data) => {
            let snippets = data.snippets || [];
            snippets = snippets.filter(snippet => snippet.id !== id);
            chrome.storage.local.set({ snippets }, () => {
                renderSnippets();
            });
        });
    }

    // Funktion zum Kopieren eines Textes in die Zwischenablage (unverändert)
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            notification.textContent = 'Text has been copied to clipboard!';
            notification.style.display = 'block';
            setTimeout(() => {
                notification.style.display = 'none';
            }, 1500);
        }).catch(err => {
            notification.textContent = '!!Copy failed!!.';
            notification.style.display = 'block';
            setTimeout(() => {
                notification.style.display = 'none';
            }, 1500);
            console.error('!!Copy failed!!', err);
        });
    }

    // Funktion zum Speichern der zuletzt gewählten Kategorie (unverändert)
    function saveLastCategory(category) {
        chrome.storage.local.set({ lastCategory: category });
        currentFilterCategory = category; 
    }

    // Funktion zum Speichern der neu geordneten Snippets (unverändert)
    function saveNewSnippetOrder(orderedIds) {
        chrome.storage.local.get('snippets', (data) => {
            let snippets = data.snippets || [];
            
            const currentCategorySnippets = snippets.filter(s => s.category === currentFilterCategory);
            
            const snippetMap = new Map(currentCategorySnippets.map(s => [s.id, s]));
            
            const reorderedSnippets = orderedIds.map(id => snippetMap.get(id)).filter(s => s); 
            
            let finalSnippets = snippets.filter(s => s.category !== currentFilterCategory);
            finalSnippets.push(...reorderedSnippets);
            
            chrome.storage.local.set({ snippets: finalSnippets });
        });
    }


    // --- Drag-and-Drop Event Handler (unverändert) ---

    function handleDragStart(e) {
        draggedItem = e.currentTarget;
        e.currentTarget.classList.add('dragging');
        e.dataTransfer.setData('text/plain', e.currentTarget.dataset.id);
        e.dataTransfer.effectAllowed = 'move';
    }

    function handleDragOver(e) {
        e.preventDefault(); 
        e.dataTransfer.dropEffect = 'move';

        const targetItem = e.currentTarget;
        if (targetItem === draggedItem) return;

        const rect = targetItem.getBoundingClientRect();
        const y = e.clientY;
        const middle = rect.top + rect.height / 2;

        document.querySelectorAll('.snippet-item').forEach(item => {
            item.classList.remove('drag-over-top', 'drag-over-bottom');
        });

        if (y < middle) {
            targetItem.classList.add('drag-over-top');
        } else {
            targetItem.classList.add('drag-over-bottom');
        }
    }
    
    function handleDragLeave(e) {
        e.currentTarget.classList.remove('drag-over-top', 'drag-over-bottom');
    }

    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();

        const targetItem = e.currentTarget;
        if (!draggedItem || targetItem === draggedItem) return;

        const isDropBefore = targetItem.classList.contains('drag-over-top');

        draggedItem.remove();

        if (isDropBefore) {
            snippetList.insertBefore(draggedItem, targetItem);
        } else {
            snippetList.insertBefore(draggedItem, targetItem.nextSibling);
        }

        document.querySelectorAll('.snippet-item').forEach(item => {
            item.classList.remove('drag-over-top', 'drag-over-bottom');
        });

        const newOrderIds = Array.from(snippetList.children).map(item => item.dataset.id);
        saveNewSnippetOrder(newOrderIds);
    }
    
    function handleDragEnd(e) {
        e.currentTarget.classList.remove('dragging');
        draggedItem = null;
    }

    // --- Rendern der Snippets ---

    // Funktion zum Rendern der Snippets
    function renderSnippets() {
        const filterCategory = currentFilterCategory; 
        
        // Wenn der Bearbeitungsmodus aktiv ist, den Button-Text zurücksetzen, falls das bearbeitete Snippet gelöscht wurde
        if (editingSnippetId && !document.getElementById('snippetList').querySelector(`[data-id="${editingSnippetId}"]`)) {
             editingSnippetId = null;
             addSnippetBtn.textContent = 'Add template';
             // Auch die Felder leeren, wenn ein in Bearbeitung befindliches Snippet nicht mehr existiert
             snippetTitleInput.value = '';
             snippetContentInput.value = '';
             snippetCategoryInput.value = '';
        }
        
        chrome.storage.local.get('snippets', (data) => {
            const snippets = data.snippets || [];
            
            snippetList.innerHTML = ''; 
            let categories = new Set(['all']);

            snippets.forEach(snippet => {
                categories.add(snippet.category);
                
                if (filterCategory === 'all' || snippet.category === filterCategory) {
                    const snippetDiv = document.createElement('div');
                    snippetDiv.className = 'snippet-item';
                    
                    snippetDiv.setAttribute('draggable', true);
                    snippetDiv.dataset.id = snippet.id; 
                    
                    snippetDiv.addEventListener('dragstart', handleDragStart);
                    snippetDiv.addEventListener('dragover', handleDragOver);
                    snippetDiv.addEventListener('dragleave', handleDragLeave);
                    snippetDiv.addEventListener('drop', handleDrop);
                    snippetDiv.addEventListener('dragend', handleDragEnd);

                    const titleEl = document.createElement('h3');
                    titleEl.textContent = snippet.title;

                    const copyBtn = document.createElement('button');
                    copyBtn.textContent = 'Kopieren';
                    copyBtn.className = 'copy-btn';
                    copyBtn.addEventListener('click', (e) => {
                        e.stopPropagation(); 
                        copyToClipboard(snippet.content);
                    });
                    
                    // NEU: Bearbeiten-Button (✏️)
                    const editBtn = document.createElement('button');
                    editBtn.textContent = '✏️'; 
                    editBtn.className = 'edit-btn icon-btn';
                    editBtn.title = 'Edit'; 
                    editBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        editSnippet(snippet.id);
                    });

                    const deleteBtn = document.createElement('button');
                    deleteBtn.textContent = '🗑️'; 
                    deleteBtn.className = 'delete-btn icon-btn';
                    deleteBtn.title = 'Delete'; 
                    deleteBtn.addEventListener('click', (e) => {
                        e.stopPropagation(); 
                        deleteSnippet(snippet.id);
                    });

                    snippetDiv.appendChild(titleEl);
                    snippetDiv.appendChild(copyBtn);
                    snippetDiv.appendChild(editBtn); // Füge den Bearbeiten-Button hinzu
                    snippetDiv.appendChild(deleteBtn);
                    snippetList.appendChild(snippetDiv);
                }
            });

            // Kategorien für den Filter aktualisieren
            categoryFilter.innerHTML = '<option value="all">All</option>';
            categories.forEach(category => {
                if (category && category !== 'all') { 
                    const option = document.createElement('option');
                    option.value = category;
                    option.textContent = category;
                    categoryFilter.appendChild(option);
                }
            });
            
            categoryFilter.value = currentFilterCategory; 
        });
    }

    // Event-Handler für das Hinzufügen/Speichern von Snippets (ruft jetzt die universelle saveSnippet auf)
    function handleAddSnippet() {
        const title = snippetTitleInput.value.trim();
        const content = snippetContentInput.value.trim();
        const category = snippetCategoryInput.value.trim() || 'Uncategorized';

        if (title && content) {
            saveSnippet(title, content, category);
            snippetTitleInput.value = '';
            snippetContentInput.value = '';
            snippetCategoryInput.value = '';
        } else {
            alert('Please enter a title and content!');
        }
    }

    // Event-Listener
    addSnippetBtn.addEventListener('click', handleAddSnippet);
    
    // Beim Ändern des Filters die neue Kategorie speichern und neu rendern
    categoryFilter.addEventListener('change', () => {
        saveLastCategory(categoryFilter.value); 
        renderSnippets(); 
    });

    // Event-Listener für den Toggle-Button
    toggleInputBtn.addEventListener('click', () => {
        inputSection.classList.toggle('hidden');
        if (inputSection.classList.contains('hidden')) {
            toggleInputBtn.textContent = 'Add new template';
        } else {
            toggleInputBtn.textContent = 'Hide input';
            
            // Wenn der Bearbeitungsmodus aktiv war, die Felder leeren und Button zurücksetzen
            if (editingSnippetId) {
                editingSnippetId = null;
                addSnippetBtn.textContent = 'Add template';
                snippetTitleInput.value = '';
                snippetContentInput.value = '';
                snippetCategoryInput.value = '';
            }
        }
    });
    
    // Funktion zur Initialisierung (unverändert)
    function initializePopup() {
        chrome.storage.local.get('lastCategory', (data) => {
            const lastCategory = data.lastCategory || 'all'; 
            currentFilterCategory = lastCategory; 
            renderSnippets();
        });
    }

    initializePopup();
});
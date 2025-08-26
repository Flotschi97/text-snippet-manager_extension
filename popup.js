document.addEventListener('DOMContentLoaded', () => {
    const addSnippetBtn = document.getElementById('addSnippetBtn');
    const snippetTitleInput = document.getElementById('snippetTitle');
    const snippetContentInput = document.getElementById('snippetContent');
    const snippetCategoryInput = document.getElementById('snippetCategory');
    const snippetList = document.getElementById('snippetList');
    const categoryFilter = document.getElementById('categoryFilter');
    const toggleInputBtn = document.getElementById('toggleInputBtn');
    const inputSection = document.getElementById('inputSection');

    // Event-Listener für den Toggle-Button
    toggleInputBtn.addEventListener('click', () => {
        inputSection.classList.toggle('hidden');
        if (inputSection.classList.contains('hidden')) {
            toggleInputBtn.textContent = 'Neues Snippet hinzufügen';
        } else {
            toggleInputBtn.textContent = 'Eingabe verbergen';
        }
    });

    // Funktion zum Speichern eines Snippets
    function saveSnippet(title, content, category) {
        // Generiere eine einzigartige ID für das Snippet
        const id = Date.now().toString(); 
        const newSnippet = { id, title, content, category };
        
        // Hole alle gespeicherten Snippets, füge das neue hinzu und speichere sie zurück
        chrome.storage.local.get('snippets', (data) => {
            const snippets = data.snippets || [];
            snippets.push(newSnippet);
            chrome.storage.local.set({ snippets }, () => {
                renderSnippets();
            });
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

    // Funktion zum Bearbeiten eines Snippets
    function editSnippet(id, newTitle, newContent) {
        chrome.storage.local.get('snippets', (data) => {
            let snippets = data.snippets || [];
            const snippetToEdit = snippets.find(snippet => snippet.id === id);
            if (snippetToEdit) {
                snippetToEdit.title = newTitle;
                snippetToEdit.content = newContent;
                chrome.storage.local.set({ snippets }, () => {
                    renderSnippets();
                });
            }
        });
    }

    // Funktion zum Kopieren eines Textes in die Zwischenablage
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            // Optional: Visuelles Feedback geben
            console.log('Text erfolgreich in die Zwischenablage kopiert!');
        }).catch(err => {
            console.error('Kopieren fehlgeschlagen:', err);
        });
    }

    // Funktion zum Rendern der Snippets
    function renderSnippets() {
        chrome.storage.local.get('snippets', (data) => {
            const snippets = data.snippets || [];
            const filterCategory = categoryFilter.value;

            snippetList.innerHTML = ''; // Liste leeren
            let categories = new Set(['all']);

            snippets.forEach(snippet => {
                categories.add(snippet.category);
                
                if (filterCategory === 'all' || snippet.category === filterCategory) {
                    const snippetDiv = document.createElement('div');
                    snippetDiv.className = 'snippet-item';

                    const titleEl = document.createElement('h3');
                    titleEl.textContent = snippet.title;

                    const copyBtn = document.createElement('button');
                    copyBtn.textContent = 'Kopieren';
                    copyBtn.className = 'copy-btn';
                    copyBtn.addEventListener('click', () => {
                        copyToClipboard(snippet.content);
                    });

                    const editBtn = document.createElement('button');
                    editBtn.textContent = 'Bearbeiten';
                    editBtn.className = 'edit-btn';
                    editBtn.addEventListener('click', () => {
                        // Eingabefelder mit den aktuellen Werten befüllen
                        snippetTitleInput.value = snippet.title;
                        snippetContentInput.value = snippet.content;
                        // Button-Text ändern, um Bearbeiten zu signalisieren
                        addSnippetBtn.textContent = 'Änderungen speichern';
                        addSnippetBtn.onclick = () => {
                            editSnippet(snippet.id, snippetTitleInput.value, snippetContentInput.value);
                            // Button und Event-Listener zurücksetzen
                            addSnippetBtn.textContent = 'Snippet hinzufügen';
                            addSnippetBtn.onclick = handleAddSnippet;
                        };
                    });

                    const deleteBtn = document.createElement('button');
                    deleteBtn.textContent = 'Löschen';
                    deleteBtn.className = 'delete-btn';
                    deleteBtn.addEventListener('click', () => {
                        deleteSnippet(snippet.id);
                    });

                    snippetDiv.appendChild(titleEl);
                    snippetDiv.appendChild(copyBtn);
                    snippetDiv.appendChild(editBtn);
                    snippetDiv.appendChild(deleteBtn);
                    snippetList.appendChild(snippetDiv);
                }
            });

            // Kategorien für den Filter aktualisieren
            categoryFilter.innerHTML = '<option value="all">Alle</option>';
            categories.forEach(category => {
                if (category !== 'all') {
                    const option = document.createElement('option');
                    option.value = category;
                    option.textContent = category;
                    categoryFilter.appendChild(option);
                }
            });
            categoryFilter.value = filterCategory;
        });
    }

    // Event-Handler für das Hinzufügen von Snippets
    function handleAddSnippet() {
        const title = snippetTitleInput.value.trim();
        const content = snippetContentInput.value.trim();
        const category = snippetCategoryInput.value.trim() || 'Unkategorisiert';

        if (title && content) {
            saveSnippet(title, content, category);
            // Felder nach dem Speichern leeren
            snippetTitleInput.value = '';
            snippetContentInput.value = '';
            snippetCategoryInput.value = '';
        } else {
            alert('Bitte gib einen Titel und einen Inhalt ein!');
        }
    }

    addSnippetBtn.addEventListener('click', handleAddSnippet);
    categoryFilter.addEventListener('change', renderSnippets);

    // Initiales Rendern der Snippets, wenn das Popup geladen wird
    renderSnippets();
});
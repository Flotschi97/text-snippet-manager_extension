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

    // Funktion zum Speichern eines Snippets
    function saveSnippet(title, content, category) {
        const id = Date.now().toString(); 
        const newSnippet = { id, title, content, category };
        
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

    // Funktion zum Kopieren eines Textes in die Zwischenablage
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            notification.textContent = 'Text wurde in die Zwischenablage kopiert!';
            notification.style.display = 'block';
            setTimeout(() => {
                notification.style.display = 'none';
            }, 1500);
        }).catch(err => {
            notification.textContent = 'Kopieren fehlgeschlagen.';
            notification.style.display = 'block';
            setTimeout(() => {
                notification.style.display = 'none';
            }, 1500);
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

                    // Der "Bearbeiten"-Button wurde entfernt
                    
                    const deleteBtn = document.createElement('button');
                    deleteBtn.textContent = '🗑️'; // Papierkorb-Emoji
                    deleteBtn.className = 'delete-btn icon-btn';
                    deleteBtn.title = 'Löschen'; // Tooltip
                    deleteBtn.addEventListener('click', () => {
                        deleteSnippet(snippet.id);
                    });

                    snippetDiv.appendChild(titleEl);
                    snippetDiv.appendChild(copyBtn);
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
            snippetTitleInput.value = '';
            snippetContentInput.value = '';
            snippetCategoryInput.value = '';
        } else {
            alert('Bitte gib einen Titel und einen Inhalt ein!');
        }
    }

    // Event-Listener
    addSnippetBtn.addEventListener('click', handleAddSnippet);
    categoryFilter.addEventListener('change', renderSnippets);

    // Event-Listener für den Toggle-Button
    toggleInputBtn.addEventListener('click', () => {
        inputSection.classList.toggle('hidden');
        if (inputSection.classList.contains('hidden')) {
            toggleInputBtn.textContent = 'Neues Snippet hinzufügen';
        } else {
            toggleInputBtn.textContent = 'Eingabe verbergen';
        }
    });

    // Initiales Rendern der Snippets, wenn das Popup geladen wird
    renderSnippets();
});
// ========================================
// ADMIN - BOOK MANAGEMENT PAGE
// ========================================

const BOOK_STATUSES = ['Available', 'Borrowed', 'Damaged', 'Lost'];
const BOOK_CONDITIONS = ['New', 'Good', 'Fair', 'Poor'];

const bookManagerState = {
    currentBook: null
};

async function ensureWalletAndContracts() {
    if (!window.walletState || !window.walletState.isConnected) {
        await connectMetaMask();
        if (!window.walletState.isConnected) {
            throw new Error('Please connect MetaMask first.');
        }
    }
    await initBlockchainContracts();
    if (!window.blockchainBooks.bookNFTContract) {
        throw new Error('BookNFT contract not loaded');
    }
}

async function fetchBookFromBlockchain(bookId) {
    await ensureWalletAndContracts();
    const contract = window.blockchainBooks.bookNFTContract;
    const info = await contract.getBookInfo(bookId);
    const status = await contract.getBookStatus(bookId);
    return {
        id: bookId,
        name: info[0],
        description: info[1],
        status: Number(status),
        condition: Number(info[3]),
        createdAt: Number(info[4]),
        imageBeforeHash: info[5],
        imageAfterHash: info[6]
    };
}

function renderBookDetailsCard(book) {
    const card = document.getElementById('bookDetailsCard');
    if (!card) return;
    card.innerHTML = `
        <h3>Book #${book.id} — ${book.name}</h3>
        <p style="margin-bottom:12px;color:#666;">${book.description || 'No description provided.'}</p>
        <div class="details-grid">
            <div class="detail-item">
                <label>Status</label>
                <p>${BOOK_STATUSES[book.status] || 'Unknown'} (#${book.status})</p>
            </div>
            <div class="detail-item">
                <label>Condition</label>
                <p>${BOOK_CONDITIONS[book.condition] || 'Unknown'} (#${book.condition})</p>
            </div>
            <div class="detail-item">
                <label>Created</label>
                <p>${new Date(book.createdAt * 1000).toLocaleString()}</p>
            </div>
            <div class="detail-item">
                <label>Image (before)</label>
                <p>${book.imageBeforeHash ? book.imageBeforeHash.slice(0, 16) + '...' : 'N/A'}</p>
            </div>
        </div>
    `;
}

function showFeedback(message, type = 'info') {
    const el = document.getElementById('lookupFeedback');
    if (!el) return;
    const colors = {
        info: '#666',
        success: '#2e7d32',
        error: '#c62828'
    };
    el.style.color = colors[type] || '#666';
    el.textContent = message;
}

async function handleLookupSubmit(event) {
    event.preventDefault();
    const input = document.getElementById('lookupBookId');
    if (!input) return;
    const bookId = Number(input.value);
    if (isNaN(bookId) || bookId < 0) {
        showFeedback('Please enter a valid non-negative ID.', 'error');
        return;
    }
    
    try {
        showFeedback('Loading book from blockchain...', 'info');
        const book = await fetchBookFromBlockchain(bookId);
        bookManagerState.currentBook = book;
        renderBookDetailsCard(book);
        document.getElementById('bookActions').style.display = 'grid';
        document.getElementById('managerStatusSelect').value = String(book.status);
        document.getElementById('managerConditionSelect').value = String(book.condition);
        showFeedback(`Loaded book #${book.id} successfully.`, 'success');
    } catch (error) {
        console.error(error);
        showFeedback(error.message || 'Failed to load book.', 'error');
        document.getElementById('bookActions').style.display = 'none';
        document.getElementById('bookDetailsCard').innerHTML = `
            <div class="empty-state">
                <i class='bx bx-error'></i>
                <p>${error.message || 'Unable to load book.'}</p>
            </div>`;
    }
}

async function updateStatusFromManager() {
    if (!bookManagerState.currentBook) {
        showFeedback('Load a book first.', 'error');
        return;
    }
    const select = document.getElementById('managerStatusSelect');
    const newStatus = Number(select.value);
    try {
        showFeedback('Updating status on blockchain...', 'info');
        await ensureWalletAndContracts();
        const contract = window.blockchainBooks.bookNFTContract.connect(window.walletState.signer);
        const tx = await contract.updateBookStatus(bookManagerState.currentBook.id, newStatus);
        await tx.wait();
        showFeedback('Status updated. Refreshing details...', 'success');
        bookManagerState.currentBook = await fetchBookFromBlockchain(bookManagerState.currentBook.id);
        renderBookDetailsCard(bookManagerState.currentBook);
    } catch (error) {
        console.error(error);
        showFeedback(error.message || 'Failed to update status.', 'error');
    }
}

async function updateConditionFromManager() {
    if (!bookManagerState.currentBook) {
        showFeedback('Load a book first.', 'error');
        return;
    }
    const select = document.getElementById('managerConditionSelect');
    const newCondition = Number(select.value);
    try {
        showFeedback('Updating condition on blockchain...', 'info');
        await ensureWalletAndContracts();
        const contract = window.blockchainBooks.bookNFTContract.connect(window.walletState.signer);
        const tx = await contract.updateCondition(bookManagerState.currentBook.id, newCondition);
        await tx.wait();
        showFeedback('Condition updated. Refreshing details...', 'success');
        bookManagerState.currentBook = await fetchBookFromBlockchain(bookManagerState.currentBook.id);
        renderBookDetailsCard(bookManagerState.currentBook);
    } catch (error) {
        console.error(error);
        showFeedback(error.message || 'Failed to update condition.', 'error');
    }
}

async function refreshCurrentBook() {
    if (!bookManagerState.currentBook) {
        showFeedback('Load a book first.', 'error');
        return;
    }
    try {
        showFeedback('Refreshing book data...', 'info');
        bookManagerState.currentBook = await fetchBookFromBlockchain(bookManagerState.currentBook.id);
        renderBookDetailsCard(bookManagerState.currentBook);
        showFeedback('Book data refreshed.', 'success');
    } catch (error) {
        console.error(error);
        showFeedback(error.message || 'Failed to refresh book.', 'error');
    }
}

function initBookManagerPage() {
    const form = document.getElementById('bookLookupForm');
    if (form && !form.dataset.bound) {
        form.addEventListener('submit', handleLookupSubmit);
        form.dataset.bound = 'true';
    }
    
    document.getElementById('updateStatusBtn')?.addEventListener('click', updateStatusFromManager);
    document.getElementById('updateConditionBtn')?.addEventListener('click', updateConditionFromManager);
    document.getElementById('refreshBookBtn')?.addEventListener('click', refreshCurrentBook);
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname === '/admin/manage') {
        initBookManagerPage();
    }
});

window.addEventListener('walletConnected', () => {
    if (window.location.pathname === '/admin/manage' && bookManagerState.currentBook) {
        refreshCurrentBook();
    }
});


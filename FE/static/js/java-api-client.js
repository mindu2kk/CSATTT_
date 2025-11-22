// ========================================
// JAVA BACKEND API CLIENT
// ========================================
// This module provides a client interface to call Java Spring Boot backend
// instead of directly interacting with blockchain from frontend

const JAVA_API_BASE_URL = 'http://localhost:8081/api/blockchain';

/**
 * Java API Client - wraps Java backend REST API calls
 */
window.javaApiClient = {
    baseUrl: JAVA_API_BASE_URL,
    
    /**
     * Check if Java backend is available
     */
    async checkConnection() {
        try {
            const response = await fetch(`${this.baseUrl}/status`);
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Java backend connected:', data);
                return { connected: true, data };
            }
            return { connected: false, error: 'Backend not responding' };
        } catch (error) {
            console.warn('⚠️ Java backend not available:', error.message);
            return { connected: false, error: error.message };
        }
    },
    
    /**
     * Get blockchain status
     */
    async getStatus() {
        const response = await fetch(`${this.baseUrl}/status`);
        if (!response.ok) throw new Error('Failed to get status');
        return await response.json();
    },
    
    /**
     * Get total books count
     */
    async getBooksCount() {
        const response = await fetch(`${this.baseUrl}/books/count`);
        if (!response.ok) throw new Error('Failed to get books count');
        const data = await response.json();
        return parseInt(data.count || data.totalBooks || 0);
    },
    
    /**
     * Get book information by token ID
     */
    async getBook(tokenId) {
        const response = await fetch(`${this.baseUrl}/books/${tokenId}`);
        if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error('Failed to get book');
        }
        const data = await response.json();
        return {
            id: parseInt(data.tokenId),
            name: data.name,
            description: data.description,
            status: parseInt(data.status),
            condition: parseInt(data.condition),
            statusText: data.statusText
        };
    },
    
    /**
     * Get all books (by iterating through token IDs)
     */
    async getAllBooks() {
        const count = await this.getBooksCount();
        const books = [];
        
        for (let i = 0; i < count; i++) {
            try {
                const book = await this.getBook(i);
                if (book) {
                    books.push(book);
                }
            } catch (error) {
                console.warn(`Failed to load book ${i}:`, error);
            }
        }
        
        return books;
    },
    
    /**
     * Mint a new book (admin only - requires backend to sign transaction)
     */
    async mintBook(name, description, condition = 5) {
        const response = await fetch(`${this.baseUrl}/books/mint`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                description,
                condition
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to mint book');
        }
        
        return await response.json();
    },
    
    /**
     * Borrow a book
     * Note: This requires the user's wallet address and deposit amount
     * The backend will handle the transaction signing
     */
    async borrowBook(bookId, depositWei, borrowerAddress) {
        const response = await fetch(`${this.baseUrl}/books/borrow`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                bookId: bookId.toString(),
                deposit: depositWei.toString(),
                borrower: borrowerAddress
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to borrow book');
        }
        
        return await response.json();
    },
    
    /**
     * Return a book
     */
    async returnBook(bookId, returnStatus, borrowerAddress) {
        const response = await fetch(`${this.baseUrl}/books/return`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                bookId: bookId.toString(),
                returnStatus: returnStatus,
                borrower: borrowerAddress
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to return book');
        }
        
        return await response.json();
    },
    
    /**
     * Get loan information
     */
    async getLoanInfo(bookId) {
        const response = await fetch(`${this.baseUrl}/loans/${bookId}`);
        if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error('Failed to get loan info');
        }
        const data = await response.json();
        return {
            bookId: parseInt(data.bookId),
            borrower: data.borrower,
            deposit: data.deposit,
            borrowDate: new Date(parseInt(data.borrowDate) * 1000),
            dueDate: new Date(parseInt(data.dueDate) * 1000),
            isReturned: data.isReturned,
            latePenalty: data.latePenalty,
            damagePenalty: data.damagePenalty
        };
    },
    
    /**
     * Get user reputation
     */
    async getReputation(address) {
        const response = await fetch(`${this.baseUrl}/reputation/${address}`);
        if (!response.ok) throw new Error('Failed to get reputation');
        const data = await response.json();
        return parseInt(data.reputation || data.reputationScore || 0);
    },
    
    /**
     * Extend loan period
     */
    async extendLoan(bookId, extensionFeeWei, borrowerAddress) {
        const response = await fetch(`${this.baseUrl}/books/extend`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                bookId: bookId.toString(),
                extensionFee: extensionFeeWei.toString(),
                borrower: borrowerAddress
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to extend loan');
        }
        
        return await response.json();
    },
    
    /**
     * Update book information (admin only)
     */
    async updateBook(tokenId, name, description) {
        const response = await fetch(`${this.baseUrl}/books/${tokenId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                description
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update book');
        }
        
        return await response.json();
    },
    
    /**
     * Get books by status
     */
    async getBooksByStatus(status, offset = 0, limit = 10) {
        const response = await fetch(
            `${this.baseUrl}/books/status/${status}?offset=${offset}&limit=${limit}`
        );
        if (!response.ok) throw new Error('Failed to get books by status');
        return await response.json();
    }
};

// Auto-check connection on load
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', async () => {
        const status = await window.javaApiClient.checkConnection();
        if (status.connected) {
            console.log('✅ Java backend API client ready');
        } else {
            console.warn('⚠️ Java backend not available. Using direct blockchain calls.');
        }
    });
}


// ========================================
// IPFS UPLOADER HELPER
// Supports nft.storage (default) and Pinata (JWT)
// ========================================

(function () {
    class IpfsUploader {
        constructor() {
            this.token = localStorage.getItem('ipfsUploader.token') || '';
            this.service = localStorage.getItem('ipfsUploader.service') || 'nftstorage';
            this.pendingTarget = null;
            this.pendingStatusSelector = null;
            this.fileInput = document.createElement('input');
            this.fileInput.type = 'file';
            this.fileInput.accept = 'image/*';
            this.fileInput.style.display = 'none';
            this.fileInput.addEventListener('change', (event) => this.handleFileSelected(event));
            document.body.appendChild(this.fileInput);
            document.addEventListener('DOMContentLoaded', () => this.bindButtons());
        }

        bindButtons() {
            document.querySelectorAll('[data-ipfs-upload-target]').forEach(button => {
                button.addEventListener('click', () => this.prepareUpload(button));
            });

            document.querySelectorAll('[data-ipfs-config-button]').forEach(button => {
                button.addEventListener('click', () => this.configureService());
            });
        }

        prepareUpload(button) {
            const targetInputId = button.getAttribute('data-ipfs-upload-target');
            if (!targetInputId) return;

            if (!this.ensureToken()) {
                return;
            }

            this.pendingTarget = targetInputId;
            this.pendingStatusSelector = button.getAttribute('data-ipfs-status') || null;
            this.fileInput.click();
        }

        ensureToken() {
            if (this.token) return true;

            // Temporarily disabled - need valid API key
            console.warn('⚠️ IPFS upload disabled: No valid API key configured');
            console.info('ℹ️ To enable: Get API key from https://nft.storage/ and run:');
            console.info('   localStorage.setItem("ipfsUploader.token", "YOUR_KEY");');
            alert('IPFS upload tạm thời bị tắt. Cần API key từ nft.storage để bật lại.\n\nXem hướng dẫn trong file IPFS_API_KEY_SETUP_GUIDE.md');
            return false; // Don't show config dialog
        }

        configureService() {
            const currentService = this.service || 'nftstorage';
            const newService = prompt(
                'Nhập dịch vụ IPFS (nftstorage hoặc pinata):',
                currentService
            );
            if (!newService) return false;

            const normalized = newService.trim().toLowerCase();
            if (!['nftstorage', 'pinata'].includes(normalized)) {
                alert('Dịch vụ không hợp lệ. Chỉ hỗ trợ "nftstorage" hoặc "pinata".');
                return false;
            }

            const tokenPrompt = normalized === 'pinata'
                ? 'Nhập Pinata JWT token (Bearer ...):'
                : 'Nhập NFT.Storage API token:';
            const newToken = prompt(tokenPrompt, this.token || '');
            if (!newToken) return false;

            this.service = normalized;
            this.token = newToken.trim();

            localStorage.setItem('ipfsUploader.token', this.token);
            localStorage.setItem('ipfsUploader.service', this.service);

            alert('Đã lưu cấu hình IPFS!');
            return true;
        }

        async handleFileSelected(event) {
            const file = event.target.files[0];
            if (!file || !this.pendingTarget) {
                this.resetInput();
                return;
            }

            try {
                this.updateStatus('⏳ Đang upload lên IPFS...');
                const cid = await this.uploadFile(file);
                const formatted = `ipfs://${cid}`;
                const targetInput = document.getElementById(this.pendingTarget);
                if (targetInput) {
                    targetInput.value = formatted;
                    targetInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
                this.updateStatus(`✅ Uploaded: ${cid.slice(0, 8)}...`);
            } catch (error) {
                console.error('IPFS upload failed:', error);
                this.updateStatus(`❌ Upload thất bại: ${error.message || error}`, true);
            } finally {
                this.resetInput();
            }
        }

        resetInput() {
            this.fileInput.value = '';
            this.pendingTarget = null;
            this.pendingStatusSelector = null;
        }

        updateStatus(message, isError = false) {
            if (!this.pendingStatusSelector) return;
            const statusEl = document.querySelector(this.pendingStatusSelector);
            if (!statusEl) return;
            statusEl.textContent = message;
            statusEl.style.display = 'block';
            statusEl.style.color = isError ? '#c0392b' : '#0d47a1';
            statusEl.style.fontWeight = '600';
            statusEl.style.marginTop = '6px';
        }

        async uploadFile(file) {
            if (this.service === 'pinata') {
                return await this.uploadViaPinata(file);
            }
            return await this.uploadViaNftStorage(file);
        }

        async uploadViaNftStorage(file) {
            const endpoint = 'https://api.nft.storage/upload';
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.token}`
                },
                body: formData
            });

            const payload = await response.json().catch(() => ({}));
            if (!response.ok || !payload?.value?.cid) {
                console.error('NFT.Storage error:', payload);
                throw new Error(payload.error?.message || payload.message || 'NFT.Storage upload failed');
            }

            return payload.value.cid;
        }

        async uploadViaPinata(file) {
            const endpoint = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
            const formData = new FormData();
            formData.append('file', file, file.name);

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.token}`
                },
                body: formData
            });

            const payload = await response.json().catch(() => ({}));
            if (!response.ok || !payload?.IpfsHash) {
                console.error('Pinata error:', payload);
                throw new Error(payload.error?.details || payload.error || 'Pinata upload failed');
            }

            return payload.IpfsHash;
        }
    }

    window.ipfsUploader = new IpfsUploader();
})();


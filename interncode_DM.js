// ================= personal_DM.js =================

class PersonalDMMessageButtons {
    constructor() {
        this.processedMessageBoxes = new WeakSet();
        this.observer = null;
        this.initObserver();
        this.initStyles();
    }

    initStyles() {
        if (document.getElementById('personal-dm-button-styles')) return;

        const style = document.createElement('style');
        style.id = 'personal-dm-button-styles';
        style.textContent = `
            .personal-dm-buttons-container {
                border: 1px solid #24268d;
                border-radius: 12px 12px 0 0;
                padding: 10px 10px 5px 10px;
                margin: 0;
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                box-shadow: 0 0 8px rgba(100, 149, 237, 0.2);
                overflow-x: auto;
                background: #ffffff;
                justify-content: flex-start;
                position: relative;
                border-bottom: none;
            }

            .personal-dm-template-btn {
                position: relative;
                overflow: hidden;
                background: #ffffff;
                color: rgb(0, 51, 204);
                border: 1px solid rgb(0, 51, 204);
                padding: 5px 10px;
                border-radius: 50px;
                font-size: 14px;
                font-weight: normal;
                cursor: pointer;
                white-space: nowrap;
                flex-shrink: 0;
                min-width: unset;
                text-align: center;
                transition: all 0.4s ease;
            }

            .personal-dm-template-btn:hover {
                background: rgb(0, 51, 204);
                color: #ffffff;
            }

            .personal-dm-template-btn:active {
                transform: scale(0.98);
            }

            .personal-dm-template-btn::after {
                content: '';
                position: absolute;
                top: var(--y);
                left: var(--x);
                width: 0;
                height: 0;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                transform: translate(-50%, -50%);
                opacity: 0;
            }

            .personal-dm-template-btn.active::after {
                width: 200px;
                height: 200px;
                opacity: 1;
                transition: width 0.5s ease-out, height 0.5s ease-out, opacity 1s ease;
            }

            .personal-dm-template-btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
                transform: none !important;
                background: #24268d;
                border: 1px solid #24268d;
                color: #ffffff;
            }

            .personal-dm-powered-by {
                width: 100%;
                border-top: 1px solid #e5e7eb;
                padding-top: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                font-size: 14px;
                color: #24268d;
                margin-top: 5px;
            }

            .personal-dm-wrapper {
                position: relative;
                margin-bottom: -1px;
                z-index: 1;
            }

            .personal-dm-ai-loading-container {
                animation: fadeIn 0.3s ease-out;
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                background: #f5f5f5;
                margin-bottom: 10px;
                width: 100%;
                padding: 10px;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }

            .personal-dm-ai-loading-message {
                font-size: 14px;
                color: #424242;
            }

            .personal-dm-stop-button {
                margin-left: 10px;
                padding: 3px 8px;
                font-size: 12px;
                background: #ffebee;
                color: #c62828;
                border: 1px solid #ef9a9a;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s;
            }

            .personal-dm-stop-button:hover {
                background: #ffcdd2 !important;
            }

            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }

            .personal-dm-error-message {
                color: #c62828;
                font-size: 14px;
                margin-top: 5px;
                text-align: center;
                width: 100%;
            }
        `;
        document.head.appendChild(style);
    }

    createAgentLinkBranding() {
        const powered = document.createElement('div');
        powered.className = 'personal-dm-powered-by';
        powered.innerHTML = `
            <span style="display:flex;align-items:center;justify-content:center;width:20px;height:20px;background:linear-gradient(to right,#4d7cfe,#9f7aea);border-radius:5px;">
                <svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none'>
                <path d='M12 8V4H8' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/>
                <rect width='16' height='12' x='4' y='8' rx='2' stroke='white' stroke-width='2'/>
                <path d='M2 14h2' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/>
                <path d='M20 14h2' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/>
                <path d='M15 13v2' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/>
                <path d='M9 13v2' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/>
                </svg>
            </span>
            <span style="font-weight:500;">Powered by AgentLink</span>
        `;
        return powered;
    }

    showError(message, container) {
        const existingError = container.querySelector('.personal-dm-error-message');
        if (existingError) existingError.remove();

        const error = document.createElement('div');
        error.className = 'personal-dm-error-message';
        error.textContent = `⚠️ ${message}`;
        container.appendChild(error);

        setTimeout(() => error.remove(), 5000);
    }

    async injectButtons(messageContainer) {
        if (this.processedMessageBoxes.has(messageContainer)) return;
        this.processedMessageBoxes.add(messageContainer);

        // Check if wrapper already exists
        let wrapper = messageContainer.previousElementSibling;
        if (wrapper && wrapper.classList.contains('personal-dm-wrapper')) {
            return; // Already injected
        }

        // Create wrapper div
        wrapper = document.createElement('div');
        wrapper.className = 'personal-dm-wrapper';

        const buttonWrapper = document.createElement('div');
        buttonWrapper.className = 'personal-dm-buttons-container';

        const { personalDmConfigs = [] } = await new Promise(resolve => {
            chrome.storage.local.get(['personalDmConfigs'], resolve);
        });

        if (personalDmConfigs.length === 0) return;

        personalDmConfigs.forEach(config => {
            const btn = document.createElement('button');
            btn.className = 'personal-dm-template-btn';
            btn.textContent = config.name || config.label || 'Template';
            btn.setAttribute('data-original-text', config.name);

            // Add ripple effect
            btn.addEventListener('click', function(e) {
                const rect = this.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                this.style.setProperty('--x', x + 'px');
                this.style.setProperty('--y', y + 'px');
                
                this.classList.add('active');
                
                setTimeout(() => {
                    this.classList.remove('active');
                }, 1000);
            });

            btn.addEventListener('click', async (e) => {
                if (btn.disabled) return;
                
                // Create abort controller for cancellation
                const abortController = new AbortController();
                let isCancelled = false;

                // Get all buttons in the container
                const buttons = buttonWrapper.querySelectorAll('.personal-dm-template-btn');
                const originalTexts = new Map(Array.from(buttons).map(btn => [btn, btn.textContent]));

                try {
                    // Hide all buttons and show loading message with stop button
                    const loadingContainer = document.createElement('div');
                    loadingContainer.className = 'personal-dm-ai-loading-container';
                    
                    const loadingMessage = document.createElement('div');
                    loadingMessage.className = 'personal-dm-ai-loading-message';
                    loadingMessage.textContent = '🤖 AgentLink is generating your message...';
                    
                    const stopButton = document.createElement('button');
                    stopButton.className = 'personal-dm-stop-button';
                    stopButton.innerHTML = '✕ Stop';
                    
                    stopButton.onmouseover = () => {
                        stopButton.style.background = '#ffcdd2';
                    };
                    stopButton.onmouseout = () => {
                        stopButton.style.background = '#ffebee';
                    };
                    
                    stopButton.onclick = () => {
                        isCancelled = true;
                        abortController.abort();
                        loadingMessage.textContent = '⏹️ Stopping generation...';
                        stopButton.disabled = true;
                    };
                    
                    loadingContainer.appendChild(loadingMessage);
                    loadingContainer.appendChild(stopButton);
                    
                    // Hide all buttons
                    buttons.forEach(btn => {
                        btn.style.display = 'none';
                    });
                    
                    // Insert loading container
                    buttonWrapper.insertBefore(loadingContainer, buttonWrapper.firstChild);

                    // Get participant data
                    const activeConversation = document.querySelector('.msg-conversation-listitem--active');
                    const participantName = activeConversation?.querySelector('.msg-conversation-card__participant-names span')?.textContent.trim();
                    
                    if (!participantName) {
                        throw new Error('Please select a conversation first');
                    }

                    // Extract the last 5 messages from the conversation
                    const lastMessages = this.extractMessages(5);
                    const aiSettings = await this.getAISettings();

                    if (isCancelled) throw new Error('Generation cancelled by user');

                    const response = await chrome.runtime.sendMessage({
                        action: "generatePersonalDm",
                        participantData: { participantName, lastMessages },
                        config,
                        aiSettings,
                        signal: abortController.signal
                    });

                    if (isCancelled) throw new Error('Generation cancelled by user');
                    if (response?.error) throw new Error(response.error);
                    if (!response?.message) throw new Error('Failed to generate message');

                    const messageBox = messageContainer.querySelector('.msg-form__contenteditable[contenteditable="true"]');
                    if (messageBox) {
                        // Completely clear the message box including any hidden formatting
                        messageBox.innerHTML = '<p><br></p>';
                        
                        // Focus and select all to ensure we're at the start
                        messageBox.focus();
                        document.execCommand('selectAll', false, null);
                        
                        // Insert the text directly at the beginning
                        document.execCommand('insertText', false, response.message);
                        
                        // Trigger necessary events
                        messageBox.dispatchEvent(new Event('input', { bubbles: true }));
                        messageBox.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                } catch (err) {
                    console.error('Error generating AI message:', err);
                    this.showError(err.message, buttonWrapper);
                } finally {
                    // Remove loading container and restore buttons
                    const loadingContainer = buttonWrapper.querySelector('.personal-dm-ai-loading-container');
                    if (loadingContainer) {
                        loadingContainer.remove();
                    }
                    
                    buttons.forEach(btn => {
                        btn.style.display = '';
                        btn.disabled = false;
                        btn.textContent = originalTexts.get(btn) || btn.getAttribute('data-original-text') || config.name;
                    });
                }
            });

            buttonWrapper.appendChild(btn);
        });

        buttonWrapper.appendChild(this.createAgentLinkBranding());
        wrapper.appendChild(buttonWrapper);

        // Insert the wrapper before the message container
        messageContainer.parentNode.insertBefore(wrapper, messageContainer);
    }

    extractMessages(limit) {
        const messageContainer = document.querySelector('.msg-s-message-list');
        const messages = [];
        
        // Variables to store the last known sender, time, and date
        let lastKnownSender = null;
        let lastKnownTime = null;
        let lastKnownDate = null;
        
        // Select all message list items
        const messageItems = messageContainer.querySelectorAll('.msg-s-message-list__event');
        
        // Iterate over all message items
        messageItems.forEach(item => {
            // Extract date if available
            const dateHeading = item.querySelector('.msg-s-message-list__time-heading');
            if (dateHeading) {
                lastKnownDate = dateHeading.textContent.trim();
            }
            
            // Extract all messages within this event
            const messageElements = item.querySelectorAll('.msg-s-event-listitem');
            
            messageElements.forEach(messageItem => {
                const senderElement = messageItem.querySelector('.msg-s-message-group__name');
                const timeElement = messageItem.querySelector('.msg-s-message-group__timestamp');
                const messageElement = messageItem.querySelector('.msg-s-event-listitem__body');
                
                // Use the last known sender, time, and date if current ones are missing
                const sender = senderElement ? senderElement.textContent.trim() : lastKnownSender;
                const time = timeElement ? timeElement.textContent.trim() : lastKnownTime;
                const message = messageElement ? messageElement.textContent.trim() : null;
                
                // Update last known sender, time, and date if current ones are valid
                if (senderElement) lastKnownSender = sender;
                if (timeElement) lastKnownTime = time;
                
                // Add the message to the array
                messages.push({
                    sender,
                    message,
                    time,
                    date: lastKnownDate
                });
            });
        });
        
        // Return only the last `limit` messages
        return messages.slice(-limit);
    }

    async getAISettings() {
        const { aiSettings = {} } = await new Promise(resolve => {
            chrome.storage.local.get(['aiSettings'], resolve);
        });
        return aiSettings;
    }

    initObserver() {
        if (this.observer) {
            this.observer.disconnect();
        }

        this.observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check if message container is directly the added node
                        const messageContainer = node.querySelector?.('.msg-form__msg-content-container') ||
                                                 (node.classList?.contains('msg-form__msg-content-container') ? node : null);

                        if (messageContainer) {
                            this.injectButtons(messageContainer);
                        } else {
                            // Fallback: check for any message containers within the subtree
                            const allContainers = node.querySelectorAll?.('.msg-form__msg-content-container');
                            allContainers?.forEach(container => {
                                this.injectButtons(container);
                            });
                        }
                    }
                });
            });
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Also try injecting into an existing message container on load
        const existingContainer = document.querySelector('.msg-form__msg-content-container');
        if (existingContainer) {
            this.injectButtons(existingContainer);
        }
    }
}
const personalDMMessageButtons = new PersonalDMMessageButtons();
window.addEventListener('load', () => {
    personalDMMessageButtons.initObserver();
});
window.addEventListener('beforeunload', () => {
    if (personalDMMessageButtons.observer) {
        personalDMMessageButtons.observer.disconnect();
    }
});
// For debugging purposes
window.personalDMMessageButtons = personalDMMessageButtons;

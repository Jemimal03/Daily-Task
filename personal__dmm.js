// ================= Fixed ContextAwareLinkedInAssistant.js =================

class ContextAwareLinkedInAssistant {
    constructor() {
        this.processedMessageBoxes = new WeakSet();
        this.observer = null;
        this.currentUser = this.detectCurrentUser();
        this.initObserver();
        this.initStyles();
    }

    // ... [UNCHANGED: All your existing initStyles(), createBranding(), showError(), etc. remain here]

    async injectButtons(messageContainer) {
        if (this.processedMessageBoxes.has(messageContainer)) return;
        this.processedMessageBoxes.add(messageContainer);

        let wrapper = messageContainer.previousElementSibling;
        if (wrapper && wrapper.classList.contains('agentlink-dm-wrapper')) return;

        wrapper = document.createElement('div');
        wrapper.className = 'agentlink-dm-wrapper';

        const buttonWrapper = document.createElement('div');
        buttonWrapper.className = 'dm-buttons-container';

        const scrollableContainer = document.createElement('div');
        scrollableContainer.className = 'dm-buttons-scrollable';

        const poweredBy = this.createBranding();

        const { personalDmConfigs = [] } = await new Promise(resolve => {
            chrome.storage.local.get(['personalDmConfigs'], resolve);
        });

        if (personalDmConfigs.length === 0) return;

        personalDmConfigs.forEach(config => {
            const btn = document.createElement('button');
            btn.className = 'dm-template-btn';
            btn.textContent = config.name;
            btn.setAttribute('data-style', config.style);
            btn.type = 'button';

            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                if (btn.disabled) return;

                const abortController = new AbortController();
                let isCancelled = false;

                const buttons = scrollableContainer.querySelectorAll('.dm-template-btn');
                const originalTexts = new Map(Array.from(buttons).map(btn => [btn, btn.textContent]));

                try {
                    const loadingContainer = document.createElement('div');
                    const loadingMessage = document.createElement('div');
                    const stopButton = document.createElement('button');

                    loadingContainer.className = 'ai-loading-container';
                    loadingMessage.className = 'ai-loading-message';
                    loadingMessage.textContent = '🤖 AgentLink is generating your reply...';

                    stopButton.className = 'stop-button';
                    stopButton.innerHTML = '✕ Stop';
                    stopButton.type = 'button';
                    stopButton.onclick = () => {
                        isCancelled = true;
                        abortController.abort();
                        loadingMessage.textContent = '⏹️ Stopping generation...';
                        stopButton.disabled = true;
                    };

                    loadingContainer.appendChild(loadingMessage);
                    loadingContainer.appendChild(stopButton);

                    buttonWrapper.insertBefore(loadingContainer, buttonWrapper.firstChild);
                    buttons.forEach(btn => btn.style.display = 'none');

                    const activeConversation = document.querySelector('.msg-conversation-listitem--active');
                    const participantName = document.querySelector('.scaffold-layout__detail.msg__detail h2')?.innerText;
                    const lastMessages = this.extractMessages(5);
                    const aiSettings = await this.getAISettings();

                    if (isCancelled) throw new Error('Generation cancelled by user');

                    // ✅ STEP 1: Request AI Response First
                    const response = await chrome.runtime.sendMessage({
                        action: "generatePersonalDm",
                        participantData: {
                            participantName,
                            lastMessages,
                            lastMessageSender: participantName,
                            isReplyingToLastSender: true
                        },
                        config,
                        aiSettings,
                        signal: abortController.signal
                    });

                    if (isCancelled) throw new Error('Generation cancelled by user');
                    if (response?.error) throw new Error(response.error);
                    if (!response?.message) throw new Error('Failed to generate message');

                    // ✅ STEP 2: Insert Message
                    this.insertMessage(response.message, messageContainer);

                    // ✅ STEP 3: Get Profile URL and Location
                    const profileLinkEl = document.querySelector('a[href*="/in/"]');
                    const profileUrl = profileLinkEl ? `https://linkedin.com${new URL(profileLinkEl.href).pathname}` : '';
                    const locationText = document.querySelector('.text-body-small.inline.t-black--light.break-words')?.innerText || '';

                    // ✅ STEP 4: Find last message from participant
                    const lastMessageFixed = [...lastMessages].reverse().find(
                        msg => msg.sender !== this.currentUser && msg.message !== response.message
                    );

                    console.log("🧪 lastMessageFromThem:", lastMessageFixed);
                    console.log("🧪 currentUser:", this.currentUser);
                    console.log("🧪 participantName:", participantName);
                    console.log("🧪 profileUrl:", profileUrl);

                    // ✅ STEP 5: Store Log
                    storeAIReplyLog(
                        participantName,
                        response.message,
                        config.name,
                        lastMessageFixed?.message || 'Unknown',
                        profileUrl,
                        locationText
                    );

                } catch (err) {
                    console.error('Error generating AI message:', err);
                    this.showError(err.message, buttonWrapper);
                } finally {
                    const loadingContainer = buttonWrapper.querySelector('.ai-loading-container');
                    if (loadingContainer) loadingContainer.remove();

                    buttons.forEach(btn => {
                        btn.style.display = '';
                        btn.disabled = false;
                        btn.textContent = originalTexts.get(btn) || btn.textContent;
                    });
                }
            });

            scrollableContainer.appendChild(btn);
        });

        buttonWrapper.appendChild(scrollableContainer);
        buttonWrapper.appendChild(poweredBy);
        wrapper.appendChild(buttonWrapper);

        messageContainer.parentNode.insertBefore(wrapper, messageContainer);
    }

    // ... other methods (analyzeMessages, extractMessages etc.) remain unchanged
}

if (window.location.hostname.includes('linkedin.com')) {
    new ContextAwareLinkedInAssistant();
}

// ✅ Log AI Reply to Local Storage with profileUrl and location
function storeAIReplyLog(participantName, aiReply, configName, participantMessage, profileUrl, location) {
    const timestamp = new Date().toISOString();
    const replyData = {
        participant: participantName,
        profileUrl: profileUrl || '',
        location: location || '',
        lastMessageFromThem: participantMessage,
        replyMessage: aiReply,
        buttonUsed: configName,
        repliedAt: timestamp
    };

    const uniqueKey = `${participantName}_${timestamp}`;

    chrome.storage.local.get({ aiReplyLogs: {} }, (result) => {
        const logs = result.aiReplyLogs;
        logs[uniqueKey] = replyData;

        chrome.storage.local.set({ aiReplyLogs: logs }, () => {
            console.log("✅ AI reply log saved successfully with profileUrl and location.");
        });
    });
}

/**
 * Waits for the entire page to finish loading (including all resources)
 * @returns {Promise<void>} Resolves when page is fully loaded
 */
async function waitForPageLoad() {
    // If already loaded, return immediately
    if (document.readyState === 'complete') return;
    
    // Otherwise wait for load event
    await new Promise(resolve => {
        window.addEventListener('load', resolve, { once: true });
    });
}

/*async function processAndCheckConversations(maxMessages = 10) {
    
    // Combined function that handles all three operations
    const unreadParticipants = [];
    const unreadParticipantsWithMessages = []; // For names with messages

    const conversationItems = document.querySelectorAll('.msg-conversation-listitem');
    
    // Filter valid conversations (first part of processConversations)
    const validConversations = Array.from(conversationItems)
        .filter(item => 
            !item.classList.contains('msg-conversation-card--occluded') && 
            item.querySelector('.msg-conversation-listitem__link')
        )
        .slice(0, maxMessages);

    debugLog(`Total conversations: ${validConversations.length}`);
    updateLiveLog(`Total conversations: ${validConversations.length}`);
    
    for (let i = 0; i < validConversations.length; i++) {
        const link = validConversations[i].querySelector('.msg-conversation-listitem__link');
        const participant = validConversations[i].querySelector('.msg-conversation-card__participant-names span');
        
        if (link && participant) {
            const participantName = participant.textContent.trim();
            
            // 5-second delay BEFORE processing each conversation
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            debugLog(`Processing conversation ${i + 1}: ${participantName}`);
            updateLiveLog(`Processing ${participantName}`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            link.click();
            
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for load
            
            // Check if sponsored message (isSponsoredMessage function incorporated)
            const hasMessageContainer = !!document.querySelector('.msg-s-message-list');
            const hasMessageTextBox = !!document.querySelector('.msg-form__msg-content-container');
            const isSponsored = !(hasMessageContainer && hasMessageTextBox);
            
            if (isSponsored) {
                debugLog(`${participantName}: It is a sponsored message`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                continue;
            }
            
            // Check last sender (messageLastSender function incorporated)
            let lastSenderResult = null;
            let extractedMessages = [];
            const messageContainer = document.querySelector('.msg-s-message-list');
            if (messageContainer) {
                const messageItems = [...messageContainer.querySelectorAll('.msg-s-message-list__event')];
                
                for (let j = messageItems.length - 1; j >= 0; j--) {
                    const senderElement = messageItems[j].querySelector('.msg-s-message-group__name');
                    if (senderElement) {
                        const lastSender = senderElement.textContent.trim();
                        const threadTitleElement = document.querySelector('#thread-detail-jump-target');
                        const threadTitle = threadTitleElement?.textContent.trim();
                        lastSenderResult = lastSender === threadTitle;
                        break;
                    }
                }
            }
            
            debugLog(`${participantName} last sender: ${lastSenderResult}`);
            updateLiveLog(`${participantName} last sender: ${lastSenderResult}`);
            
            if (lastSenderResult === true) { 
                await new Promise(resolve => setTimeout(resolve, 1000));
                extractedMessages = extractMessages(5); // Extract last 5 messages
                debugLog(`Extracted messages from ${participantName}:`, extractedMessages);
                
                unreadParticipants.push(participantName);
                
                unreadParticipantsWithMessages.push({
                    participantName,
                    messages: extractedMessages
                });

            }
            
            await new Promise(resolve => setTimeout(resolve, 1000)); // Short wait
        }
    }
    
    debugLog('Finished processing all conversations');
    debugLog('UnreadMessageParticipants:', JSON.stringify(unreadParticipants));
    debugLog('UnreadMessageParticipantsWithMessages:', JSON.stringify(unreadParticipantsWithMessages));

    return unreadParticipantsWithMessages;
}*/

async function extractUnreadMessages(participantNames) {
    const unreadMessages = [];
    const conversationCards = document.querySelectorAll('.msg-conversation-listitem');
   
    for (const participantName of participantNames) {
        const card = Array.from(conversationCards).find(card => {
            const nameElement = card.querySelector('.msg-conversation-card__participant-names span');
            return nameElement?.textContent.trim() === participantName;
        });
        
        if (!card) continue;

        try {
            // Extract timestamp from the correct element
            const timestampElem = card.querySelector('.msg-conversation-listitem__time-stamp');
            const timestamp = timestampElem?.textContent.trim() || new Date().toLocaleTimeString('en-GB', { hour12: true });
            
            // Extract message snippet and determine sender
            const messageSnippetElement = card.querySelector('.msg-conversation-card__message-snippet--v2, .msg-conversation-card__message-snippet');
            const fullMessage = messageSnippetElement?.textContent.trim() || 'No message';

            // Extract sender (either "You" or participant name)
            let sentBy = participantName;
            let message = fullMessage;

            if (fullMessage.startsWith('You:')) {
                sentBy = 'You';
                message = fullMessage.replace(/^You:\s*/, '').trim();
            } else if (fullMessage.includes(':')) {
                // If message has "ParticipantName: message" format
                const colonIndex = fullMessage.indexOf(':');
                sentBy = fullMessage.substring(0, colonIndex).trim();
                message = fullMessage.substring(colonIndex + 1).trim();
            }

            // Extract other details
            const presenceIndicator = card.querySelector('.presence-indicator');
            const starIcon = card.querySelector('.msg-conversation-card__star-icon');
            const muteIcon = card.querySelector('.msg-conversation-card__mute-icon');
            
            unreadMessages.push({
                participantName,
                timestamp,
                sentBy: participantName,
                message: messageSnippetElement?.textContent.replace(/^You:\s*/, '').trim() || 'No message',
                isOnline: presenceIndicator?.classList.contains('presence-indicator--is-online') || 
                          presenceIndicator?.classList.contains('presence-indicator--is-reachable'),
                isStarred: starIcon?.classList.contains('msg-conversation-card__star-icon--starred'),
                isMuted: !!muteIcon,
                messageStatus: 'unread',
                unreadMessageCount: 5
            });
        } catch (error) {
            console.error(`Error processing ${participantName}:`, error);
        }
    }
    
    debugLog('Unread messages :', unreadMessages);
    return unreadMessages;
}

function extractMessages(limit) {
    const messageContainer = document.querySelector('.msg-s-message-list'); // Replace with the correct selector for your message container
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



async function activateConversation(participantName) {
    // Find all conversation cards
    const conversationCards = document.querySelectorAll('.msg-conversation-listitem');
    
    for (const card of conversationCards) {
        // Find the participant name element within each card
        const nameElement = card.querySelector('.msg-conversation-card__participant-names span');
        if (!nameElement) continue;
        
        const cardParticipantName = nameElement.textContent.trim();
        
        if (cardParticipantName === participantName) {
            console.log(`Found matching conversation for ${participantName}`);
            
            // Scroll the card into view (center of screen)
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Wait a bit for scrolling to complete
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Get the clickable element (the link inside the card)
            const clickableElement = card.querySelector('.msg-conversation-listitem__link');
            if (!clickableElement) {
                console.error('Could not find clickable element in conversation card');
                return false;
            }
            
            // Create and dispatch a proper click event
            const clickEvent = new MouseEvent('click', {
                view: window,
                bubbles: true,
                cancelable: true,
                composed: true
            });
            
            // Dispatch the event
            clickableElement.dispatchEvent(clickEvent);
            
            // Wait for the conversation to load
            await new Promise(resolve => setTimeout(resolve, 1000));
            return true;
        }
    }
    
    console.error(`Could not find conversation for ${participantName}`);
    return false;
}

async function addPersonalDmButtons() {
    // Check if message box exists
    const messageFormContainer = document.querySelector('.msg-form__msg-content-container');
    if (!messageFormContainer) return;

    // Check if we already added the carousel
    if (document.querySelector('.personal-dm-main-carousel')) return;

    // Get Personal DM configs from storage
    const { personalDmConfigs = [] } = await new Promise(resolve => {
        chrome.storage.local.get(['personalDmConfigs'], resolve);
    });

    if (personalDmConfigs.length === 0) return;

    // Constants for layout
    const CAROUSEL_WIDTH = 400;
    const BUTTONS_PER_SLIDE = 3;
    const BUTTON_MIN_WIDTH = 40;
    const ARROW_WIDTH = 20;

    let isAnyButtonProcessing = false;

    // Create the main container
    const mainCarouselContainer = document.createElement('div');
    mainCarouselContainer.className = 'personal-dm-main-carousel';
    mainCarouselContainer.style.cssText = `
        width: 100%;
        margin: 0 0 8px 0;
        padding: 2px;
        background-color: #f9f9f9;
        border-radius: 4px;
        border: 1px solid #e0e0e0;
    `;

    // Calculate slides
    const slidesCount = Math.ceil(personalDmConfigs.length / BUTTONS_PER_SLIDE);
    
    // Create carousel
    const carouselContainer = document.createElement('div');
    carouselContainer.className = 'personal-dm-carousel';
    carouselContainer.style.cssText = `
        position: relative;
        width: ${CAROUSEL_WIDTH}px;
        height: 30px;
        overflow: hidden;
        margin: 0 auto;
    `;

    // Slides container
    const slidesContainer = document.createElement('div');
    slidesContainer.className = 'carousel-slides';
    slidesContainer.style.cssText = `
        display: flex;
        width: ${slidesCount * CAROUSEL_WIDTH}px;
        height: 100%;
        transition: transform 0.3s ease;
    `;

    // Navigation arrows
    const createArrow = (direction) => {
        const arrow = document.createElement('div');
        arrow.innerHTML = direction === 'left' ? '&lt;' : '&gt;';
        arrow.className = `carousel-arrow ${direction}`;
        arrow.style.cssText = `
            position: absolute;
            ${direction}: 0;
            top: 0;
            height: 100%;
            width: ${ARROW_WIDTH}px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(90deg, #0033cc, #6e2edc);
            color: white;
            cursor: pointer;
            z-index: 2;
            font-size: 12px;
            border-radius: ${direction === 'left' ? '4px 0 0 4px' : '0 4px 4px 0'};
        `;
        return arrow;
    };

    const leftArrow = createArrow('left');
    const rightArrow = createArrow('right');

    // Carousel state
    let currentSlide = 0;
    
    // Create slides
    for (let i = 0; i < slidesCount; i++) {
        const slide = document.createElement('div');
        slide.className = 'carousel-slide';
        slide.style.cssText = `
            width: ${CAROUSEL_WIDTH}px;
            height: 100%;
            display: flex;
            gap: 4px;
            padding: 0 ${ARROW_WIDTH}px;
            box-sizing: border-box;
            align-items: center;
        `;
        
        // Add buttons
        personalDmConfigs.slice(i * BUTTONS_PER_SLIDE, (i + 1) * BUTTONS_PER_SLIDE)
            .forEach(config => {
                const btn = document.createElement('button');
                btn.className = 'personal-dm-btn';
                btn.textContent = config.name;
                btn.style.cssText = `
                    padding: 2px 5px;
                    font-size: 12px;
                    background: linear-gradient(90deg, #0033cc, #6e2edc);
                    color: white;
                    border: none;
                    border-radius: 2px;
                    cursor: pointer;
                    height: 22px;
                    min-width: ${BUTTON_MIN_WIDTH}px;
                    line-height: 18px;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.2);
                    white-space: nowrap;
                    flex: 1;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    transition: all 0.2s ease;
                `;
                
                btn.addEventListener('mouseenter', () => {
                    btn.style.background = 'linear-gradient(90deg, #002299, #5d23c2)';
                });
                    
                btn.addEventListener('mouseleave', () => {
                    btn.style.background = 'linear-gradient(90deg, #0033cc, #6e2edc)';
                });
                
                btn.addEventListener('click', async () => {
                    if (isAnyButtonProcessing) return;
                    
                    isAnyButtonProcessing = true;
                    disableAllButtons();
                    btn.style.opacity = '0.7';
                    
                    try {
                        const activeConversation = document.querySelector('.msg-conversation-listitem--active');
                        const participantName = activeConversation?.querySelector('.msg-conversation-card__participant-names span')?.textContent.trim();
                        
                        if (!participantName){
                            showErrorToast('please select a conversation first!');
                            return;
                        }
                        
                        // Extract the last 5 messages from the conversation
                        const lastMessages = extractMessages(5);

                        const response = await chrome.runtime.sendMessage({
                            action: "generatePersonalDm",
                            participantData: { participantName, lastMessages},
                            config,
                            aiSettings: await getAISettings()
                        });
                        
                        if (!response?.message) throw new Error('Empty response');
                        
                        await simulatePasting(response.message);
                        await new Promise(resolve => setTimeout(resolve, 500));
                        
                    } catch (error) {
                        console.error('DM Error:', error);
                        showErrorToast(`Failed: ${error.message}`);
                    } finally {
                        isAnyButtonProcessing = false;
                        enableAllButtons();
                        btn.style.opacity = '1';
                    }
                });
                
                slide.appendChild(btn);
            });
        
        slidesContainer.appendChild(slide);
    }
    
    // Navigation functions
    const updateCarousel = () => {
        slidesContainer.style.transform = `translateX(-${currentSlide * CAROUSEL_WIDTH}px)`;
        leftArrow.style.visibility = currentSlide > 0 ? 'visible' : 'hidden';
        rightArrow.style.visibility = currentSlide < slidesCount - 1 ? 'visible' : 'hidden';
    };
    
    leftArrow.addEventListener('click', () => {
        if (currentSlide <= 0) return;
        currentSlide--;
        updateCarousel();
    });
    
    rightArrow.addEventListener('click', () => {
        if (currentSlide >= slidesCount - 1) return;
        currentSlide++;
        updateCarousel();
    });

    // Assemble carousel
    carouselContainer.appendChild(slidesContainer);
    carouselContainer.appendChild(leftArrow);
    carouselContainer.appendChild(rightArrow);
    mainCarouselContainer.appendChild(carouselContainer);

    // Insert into DOM - above message box
    const messageForm = document.querySelector('.msg-form__contenteditable')?.closest('.msg-form__msg-content-container');
    if (messageForm) {
        messageForm.parentNode.insertBefore(mainCarouselContainer, messageForm);
    }

    // Helper functions
    const disableAllButtons = () => {
        document.querySelectorAll('.personal-dm-btn').forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.5';
        });
    };

    const enableAllButtons = () => {
        document.querySelectorAll('.personal-dm-btn').forEach(btn => {
            btn.disabled = false;
            btn.style.opacity = '1';
        });
    };

    // Initialize
    updateCarousel();
}

// Improved initialization with better observer logic
function initDmButtons() {
    // Clean up any existing observers first
    if (window.dmButtonObserver) {
        window.dmButtonObserver.disconnect();
    }

    // Add buttons immediately if conditions are met
    addPersonalDmButtons();

    // Set up a more precise observer
    window.dmButtonObserver = new MutationObserver((mutations) => {
        // Check if message form appeared
        const messageFormAdded = mutations.some(mutation => 
            Array.from(mutation.addedNodes).some(node => 
                node.classList?.contains('msg-form__contenteditable')
            )
        );
        
        // Check if our carousel exists
        const carouselExists = document.querySelector('.personal-dm-main-carousel');

        if (messageFormAdded && !carouselExists) {
            addPersonalDmButtons();
        }
    });

    // Observe only specific parts of the DOM
    const composeArea = document.querySelector('.msg-form') || document.body;
    window.dmButtonObserver.observe(composeArea, {
        childList: true,
        subtree: true
    });
}

// Start the functionality
async function getAISettings() {
    return new Promise(resolve => {
        chrome.storage.local.get(['aiSettings'], (result) => {
            resolve(result.aiSettings || {});
        });
    });
}

// Function to paste text directly into the message box
async function simulatePasting(text) {
    
    const messageBox = document.querySelector('.msg-form__contenteditable');
    const placeholder = document.querySelector('.msg-form__placeholder');
    
    if (!messageBox) {
        console.error('Message box not found.');
        return Promise.reject('Message box not found.');
    }

    messageBox.focus();
    if (placeholder) {
        placeholder.style.display = 'none';
    }
    
    // Clear any existing content
    messageBox.innerHTML = '<p></p>';
    let p = messageBox.querySelector('p');
    if (!p) {
        p = document.createElement('p');
        messageBox.appendChild(p);
    }
    
    // Insert the full text at once
    p.textContent = text;

    // Dispatch input event to trigger any listeners
    const inputEvent = new Event('input', {
        bubbles: true,
        cancelable: true,
    });
    messageBox.dispatchEvent(inputEvent);

    // Optional: Add a small delay to make it seem more natural
    await new Promise(resolve => setTimeout(resolve, 200));
    
    
    return Promise.resolve('Pasting complete');
}



// Function to send messages to the background script
async function sendMessagesToBackground(messages) {
    return new Promise((resolve, reject) => {
        console.log("Messages sending to background script")
        chrome.runtime.sendMessage({
            action: "getWorkflowReply",
            data: {
                messages: messages  // Pass the extracted messages to the background script
            }
        }, response => {
            if (response.message) {
                resolve(response.message); // Resolve with the generated reply
            } else if (response.error) {
                reject(response.error); // Reject with the error message
            } else {
                reject("No valid response from the background script.");
            }
        });
    });
}

// Load the live log script
function loadLiveLogScript() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('livelog.js');
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load live log script'));
        document.body.appendChild(script);
    });
}

async function main() {

    if (!isMessagingPage()) return;
    
    await waitForPageLoad();
    console.log('Page fully loaded!');
    debugLog('Page fully loaded!');

    await loadLiveLogScript();
    debugLog('Waiting 5 seconds before processing');
    updateLiveLog("Starting Process in", 5);
    debugLog(`Processing.....`);
    updateLiveLog("Processing messages...");
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 1. First get the unread participants
    updateLiveLog("Process started");
   
    await new Promise(resolve => setTimeout(resolve, 1000));
  
    // 3. Call the button function with unread participants
    initDmButtons();
}
// Function to check if we're on LinkedIn messaging page
function isMessagingPage() {
    return window.location.href.startsWith('https://www.linkedin.com/messaging/');
  }

main();
  // Add this function to remove live log and debug panel
function removeLiveLogElements() {
    const liveLog = document.getElementById('liveLogContainer');
    const debugPanel = document.getElementById('debugPanel');
    
    if (liveLog) liveLog.remove();
    if (debugPanel) debugPanel.remove();
}

// Modify your existing MutationObserver to handle this
let lastUrl = window.location.href;
new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
        const wasOnMessagingPage = lastUrl.startsWith('https://www.linkedin.com/messaging/');
        const isNowOnMessagingPage = window.location.href.startsWith('https://www.linkedin.com/messaging/');
        lastUrl = window.location.href;
        
        if (isNowOnMessagingPage) {
            createProcessingButton();
            // Live log will be recreated when main() runs again
        } else {
            const existingBtn = document.getElementById('startProcessingBtn');
            if (existingBtn) existingBtn.remove();
            removeLiveLogElements(); // Remove live log when navigating away
        }
    }
}).observe(document, {subtree: true, childList: true});

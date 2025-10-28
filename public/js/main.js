//======================================
//       ONLOAD / INIT  CODE:
//======================================
class Tab {
   constructor(initialiseTabContent, generateTabState, loadTabFromState) {
       this.initialiseTabContent = initialiseTabContent;
       this.generateTabState = generateTabState;
       this.loadTabFromState = loadTabFromState;
   }
}
export { Tab };

// Function to remove existing all tabs-specific .css
function removeExistingTabAssets() {
   const existingStyles = document.querySelectorAll('link[href*="tab-"]');
   existingStyles.forEach(style => style.remove());
}

// Function to load the script and initialize tab content
async function loadScriptAndInitialise(selectedTab) {
   removeExistingTabAssets();

   const tabJS = `/dashboard/js/tab-${selectedTab}.js`;
   const tabCSS = `/dashboard/css/tab-${selectedTab}.css`;

   // Load CSS
   const linkTag = document.createElement('link');
   linkTag.rel = 'stylesheet';
   linkTag.href = tabCSS;
   document.head.appendChild(linkTag);

   // Dynamically import the tab module
   try {
       const tabModule = await import(tabJS);
       const tabInstance = tabModule.default;

       // Set the current tab instance and initialize it
       window.currentTab = tabInstance;
       window.currentTab.initialiseTabContent();
   } catch (error) {
       console.error('Failed to load tab module:', error);
   }
}

function onTabLoad(selectedTab) {
   loadScriptAndInitialise(selectedTab);
}
export { onTabLoad };


document.addEventListener('DOMContentLoaded', () => {

   initShareButton();
   sourceState(); // init state when passed in

   // Add handler to tabs

   const tabLinks   = document.querySelectorAll('.tab-link');
   const tabContent = document.getElementById('tab-content-id');

   const state = window.jsonState = sourceState(window.compressedState);

   tabLinks.forEach(link => {
      link.addEventListener('click', async (e) => {
         const activeTabId = getActiveTabId();
         if (!activeTabId || activeTabId != link.id) {
            e.preventDefault();
            const selectedTab = e.target.getAttribute('data-tab');

            try {
               let queryString = (state && state.tabId === link.id) ?  state.queryArg : getAllUrlArgs();
               queryString = (queryString) ? `?${queryString}` : "";

               const response = await fetch(`/dashboard/tab/${selectedTab}${queryString}`);
               if (!response.ok) {
                  throw new Error('Network response');
               }
               const html = await response.text();
               tabContent.innerHTML = html;

               // Load the tab-specific JS and CSS files
               onTabLoad(selectedTab);

               // update active tab styling
               tabLinks.forEach(l => l.classList.remove('is-active'));
               e.target.classList.add('is-active');
            } catch (error) {
               console.error('Failed to load tab content:', error);
               tabContent.innerHTML = '<p>Error loading content.</p>';
            }
      }
      });
   });

   if (tabLinks.length > 0) {
      const tab = (state && state.tabId) ? document.getElementById(state.tabId) : undefined;
      if (tab) {
         tab.click();
      }
      else  {
         const tabId = tabLinks.length > 2 ? 2 : 0; // Default tab to 'product owner'
         tabLinks[tabId].click();
      }
   }
 });

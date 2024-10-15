//======================================
//       ONLOAD / INIT  CODE:
//======================================

document.addEventListener('DOMContentLoaded', () => {

   initShareButton();
   sourceState(); // init state when passed in

   //-----------------------------------
   // 1 - Add handler to tabs
   //-----------------------------------

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
               const queryString = (state && state.queryArg) ? `?${state.queryArg}` : "";

               const response = await fetch(`/dashboard/tab/${selectedTab}${queryString}`);
               if (!response.ok) {
                  throw new Error('Network response');
               }
               const html = await response.text();
               tabContent.innerHTML = html;

               // Ensure that the script from the tab content is loaded
               const scriptTag = document.createElement('script');
               scriptTag.src = `/js/tab-${selectedTab}.js`;  // Each tab should have its own JS file
               scriptTag.onload = () => initialiseTabContent();  // Call the tab-specific init function once the script is loaded
               document.body.appendChild(scriptTag);

               // update active tab styling
               tabLinks.forEach(l => l.classList.remove('active'));
               e.target.classList.add('active');
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
         const tabId = (tabLinks.length > 1) ? 1   // services
                                             : 0;  // endol
         tabLinks[tabId].click();
      }
   }
 });
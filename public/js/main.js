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
               let queryString = (state && state.tabId === link.id) ?  state.queryArg : getAllUrlArgs();
               queryString = (queryString) ? `?${queryString}` : "";

               const response = await fetch(`/dashboard/tab/${selectedTab}${queryString}`);
               if (!response.ok) {
                  throw new Error('Network response');
               }
               const html = await response.text();
               tabContent.innerHTML = html;

               // attach both the JS and CSS files associated to each tab
               // JS:
               const tabJS = `/dashboard/js/tab-${selectedTab}.js`;
               if (!document.querySelector(`script[src="${tabJS}"]`)) {
                   const scriptTag = document.createElement('script');
                   scriptTag.src = tabJS;
                   scriptTag.onload = () => initialiseTabContent();  // Call the tab-specific init function once the script is loaded
                   document.body.appendChild(scriptTag);
               }
               // CSS:
               const tabCSS = `/dashboard/css/tab-${selectedTab}.css`;
               if (!document.querySelector(`link[href="${tabCSS}"]`)) {
                   const linkTag = document.createElement('link');
                   linkTag.rel = 'stylesheet';
                   linkTag.href = tabCSS;
                   document.head.appendChild(linkTag);
               }

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
         const tabId = (tabLinks.length > 1) ? 1   // (default) services
                                             : 0;  // endol
         tabLinks[tabId].click();
      }
   }
 });

//======================================
//       ONLOAD / INIT  CODE:
//======================================
document.addEventListener('DOMContentLoaded', () => {

   //-----------------------------------
   // 1 - Add handler to tabs
   //-----------------------------------

   const tabLinks   = document.querySelectorAll('.tab-link');
   const tabContent = document.getElementById('tab-content-id');
 
   tabLinks.forEach(link => {
      link.addEventListener('click', async (e) => {
         e.preventDefault();
         const selectedTab = e.target.getAttribute('data-tab');

         try {
            const response = await fetch(`/dashboard/tab/${selectedTab}`);
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
      });
   });
 });
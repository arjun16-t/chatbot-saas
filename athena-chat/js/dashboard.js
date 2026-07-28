/*
========================================
ORGANIZATION NOTE

Each feature below lives in its own object
(Sidebar, Header, DocumentLedger, etc.) with an init()
method. initDashboardApp() at the bottom just calls
Feature.init() for each one, in order.
========================================
*/

/*
========================================
INITIALIZATION
========================================
*/
document.addEventListener("DOMContentLoaded", initDashboardApp);

function initDashboardApp() {
  Header.init();
  SidebarInteractions.init();
  TableSort.init();
  Uploader.init();
  DocumentLedger.init();
  AuthControls.init();
  ScrollDynamics.init();
}


/*
========================================
SIDEBAR DROPDOWNS & COLLAPSIBLES
========================================
*/
const SidebarInteractions = {
  init() {
    // Quick Links Collapsible
    const trigger = document.querySelector('.collapsible-trigger');
    const content = document.querySelector('.collapsible-content');
    
    if (trigger && content) {
      trigger.addEventListener('click', () => {
        const isExpanded = trigger.getAttribute('aria-expanded') === 'true';
        trigger.setAttribute('aria-expanded', !isExpanded);
        
        if (isExpanded) {
          content.style.maxHeight = '0px';
        } else {
          content.style.maxHeight = content.scrollHeight + 'px';
        }
      });
      // Initial height setting
      content.style.maxHeight = content.scrollHeight + 'px';
    }

    // Profile Menu Dropdown
    const profileBtn = document.getElementById('profile-menu-btn');
    const profileMenu = document.getElementById('profile-menu');
    
    if (profileBtn && profileMenu) {
      profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isExpanded = profileBtn.getAttribute('aria-expanded') === 'true';
        profileBtn.setAttribute('aria-expanded', !isExpanded);
        profileMenu.classList.toggle('is-active');
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!profileBtn.contains(e.target) && !profileMenu.contains(e.target)) {
          profileBtn.setAttribute('aria-expanded', 'false');
          profileMenu.classList.remove('is-active');
        }
      });
    }
  }
};


/*
========================================
HEADER & DYNAMIC GREETING
========================================
*/
const Header = {
  dateElement: null,
  greetingElement: null,

  init() {
    Header.dateElement = document.getElementById('current-date');
    Header.greetingElement = document.getElementById('greeting-text');
    
    Header.updateDate();
    Header.updateGreeting();
  },

  updateDate() {
    if (!Header.dateElement) return;
    const now = new Date();
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    Header.dateElement.textContent = now.toLocaleDateString('en-US', options);
  },

  updateGreeting() {
    if (!Header.greetingElement) return;
    
    const hour = new Date().getHours();
    let timeOfDay = 'Evening';
    
    if (hour >= 5 && hour < 12) {
      timeOfDay = 'Morning';
    } else if (hour >= 12 && hour < 17) {
      timeOfDay = 'Afternoon';
    }
    
    Header.greetingElement.textContent = `Good ${timeOfDay}, Arjun`;
  }
};


/*
========================================
UPLOAD WORKSPACE
========================================
*/
const Uploader = {
  card: null,
  uploadBtn: null,

  init() {
    Uploader.card = document.querySelector('.upload-card');
    Uploader.uploadBtn = document.querySelector('.upload-actions .btn-primary');
    if (!Uploader.card) return;

    // Drag and Drop visual feedback
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      Uploader.card.addEventListener(eventName, Uploader.preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      Uploader.card.addEventListener(eventName, () => {
        Uploader.card.style.borderColor = 'var(--color-accent-primary)';
        Uploader.card.style.backgroundColor = 'rgba(200, 134, 10, 0.04)';
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      Uploader.card.addEventListener(eventName, () => {
        Uploader.card.style.borderColor = 'var(--color-border)';
        Uploader.card.style.backgroundColor = 'transparent';
      }, false);
    });

    // Handle Drop
    Uploader.card.addEventListener('drop', Uploader.handleDrop, false);
    
    // Handle Click
    if (Uploader.uploadBtn) {
      Uploader.uploadBtn.addEventListener('click', Uploader.handleClick);
    }
  },

  preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  },

  handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    Uploader.processFiles(files);
  },

  handleClick(e) {
    e.preventDefault();
    // Simulate file input click
    console.log("TODO: Trigger hidden file input click");
  },

  processFiles(files) {
    if (files.length > 0) {
      console.log('TODO: Wire up document upload for:', files[0].name);
      // Here you would typically construct a FormData object 
      // and send it to your backend via fetch()
    }
  }
};


/*
========================================
DOCUMENT LEDGER (TABLE)
========================================
*/
const DocumentLedger = {
  searchInput: null,
  tableRows: null,
  deleteButtons: null,

  init() {
    DocumentLedger.searchInput = document.querySelector('.search-input');
    DocumentLedger.tableRows = document.querySelectorAll('.table tbody tr');
    DocumentLedger.deleteButtons = document.querySelectorAll('.btn-danger');

    if (DocumentLedger.searchInput && DocumentLedger.tableRows.length) {
      DocumentLedger.searchInput.addEventListener('input', DocumentLedger.handleSearch);
    }

    if (DocumentLedger.deleteButtons.length) {
      DocumentLedger.deleteButtons.forEach(btn => {
        // Skip disabled buttons (e.g., documents currently processing)
        if (!btn.disabled) {
          btn.addEventListener('click', DocumentLedger.handleDelete);
        }
      });
    }
  },

  handleSearch(e) {
    const query = e.target.value.toLowerCase();

    DocumentLedger.tableRows.forEach(row => {
      // Grab all text content from the row for broad searching
      const rowText = row.textContent.toLowerCase();
      
      if (rowText.includes(query)) {
        row.style.display = ''; // Show
      } else {
        row.style.display = 'none'; // Hide
      }
    });
  },

  handleDelete(e) {
    // Traverse up to find the closest table row
    const row = e.currentTarget.closest('tr');
    if (!row) return;

    const filename = row.querySelector('.file-name-cell strong').textContent;
    
    // Minimal native confirmation before destructive action
    const isConfirmed = confirm(`Are you sure you want to delete "${filename}"? This action cannot be undone.`);
    
    if (isConfirmed) {
      console.log(`TODO: Wire up DELETE request to /api/documents/`);
      
      // Visually remove the row from the table with a slight delay for feel
      row.style.opacity = '0.5';
      row.style.pointerEvents = 'none';
      
      setTimeout(() => {
        row.remove();
      }, 300);
    }
  }
};


/*
========================================
AUTH CONTROLS
========================================
*/
const AuthControls = {
  logoutBtn: null,

  init() {
    AuthControls.logoutBtn = document.querySelector('.logout-btn');
    if (AuthControls.logoutBtn) {
      AuthControls.logoutBtn.addEventListener('click', AuthControls.handleLogout);
    }
  },

  handleLogout(e) {
    e.preventDefault();
    console.log("TODO: Clear JWT tokens from memory/cookies");
    
    // Simulate redirection to login
    window.location.href = "login.html";
  }
};

/*
========================================
TABLE SORTING
========================================
*/
const TableSort = {
  init() {
    const headers = document.querySelectorAll('th.sortable');
    const tableBody = document.querySelector('#document-table tbody');
    
    if (!headers.length || !tableBody) return;

    headers.forEach(header => {
      header.addEventListener('click', () => {
        const sortType = header.getAttribute('data-sort');
        // If it's already sorted ascending, switch to descending. Otherwise default to ascending.
        const isAscending = header.classList.contains('asc') ? false : true;
        
        // Reset all headers
        headers.forEach(h => {
          h.classList.remove('is-sorted', 'asc', 'desc');
        });
        
        // Mark current header and apply directional class for CSS rotation
        header.classList.add('is-sorted');
        header.classList.add(isAscending ? 'asc' : 'desc');
        
        // Sort rows
        const rows = Array.from(tableBody.querySelectorAll('tr'));
        rows.sort((a, b) => {
          const aTd = a.querySelector(`td:nth-child(${header.cellIndex + 1})`);
          const bTd = b.querySelector(`td:nth-child(${header.cellIndex + 1})`);
          
          const aVal = aTd.getAttribute('data-value') || aTd.textContent.trim();
          const bVal = bTd.getAttribute('data-value') || bTd.textContent.trim();

          if (aVal < bVal) return isAscending ? -1 : 1;
          if (aVal > bVal) return isAscending ? 1 : -1;
          return 0;
        });
        
        // Append sorted rows
        tableBody.append(...rows);
      });
    });
  }
};

/*
========================================
SCROLL DYNAMICS (HEADER SHRINK)
========================================
*/
const ScrollDynamics = {
  init() {
    const mainScrollArea = document.getElementById('main-scroll-area');
    const mainHeader = document.getElementById('main-header');

    if (!mainScrollArea || !mainHeader) return;

    mainScrollArea.addEventListener('scroll', () => {
      // Toggle the shrunk class if scrolled past 20px
      if (mainScrollArea.scrollTop > 20) {
        mainHeader.classList.add('is-scrolled');
      } else {
        mainHeader.classList.remove('is-scrolled');
      }
    }, { passive: true });
  }
};
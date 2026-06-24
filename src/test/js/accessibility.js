export const accessibility = {
  init() {
    this.addAriaRoles();
    this.setupKeyboardNavigation();
    this.setupFocusManagement();
  },

  addAriaRoles() {
    // Buttons
    document.querySelectorAll('button').forEach(button => {
      if (!button.getAttribute('role')) {
        button.setAttribute('role', 'button');
      }
      if (!button.getAttribute('tabindex') && !button.disabled) {
        button.setAttribute('tabindex', '0');
      }
    });

    // Modals
    document.querySelectorAll('[data-modal]').forEach(modal => {
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      const title = modal.querySelector('h1, h2, h3')?.textContent || 'Dialog';
      modal.setAttribute('aria-label', title);
      
      // Add close button aria-label
      const closeBtn = modal.querySelector('[data-close-modal]');
      if (closeBtn && !closeBtn.getAttribute('aria-label')) {
        closeBtn.setAttribute('aria-label', `Close ${title}`);
      }
    });

    // Forms
    document.querySelectorAll('form').forEach(form => {
      form.setAttribute('role', 'form');
    });

    // Form controls
    document.querySelectorAll('input, select, textarea').forEach(control => {
      if (!control.id) {
        control.id = `input-${Math.random().toString(36).substr(2, 8)}`;
      }
      
      const label = document.querySelector(`label[for="${control.id}"]`);
      if (label && !control.getAttribute('aria-labelledby')) {
        if (!label.id) {
          label.id = `label-${control.id}`;
        }
        control.setAttribute('aria-labelledby', label.id);
      }
    });
  },

  setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
      // Close modals on ESC
      if (e.key === 'Escape') {
        const openModal = document.querySelector('[data-modal]:not(.hidden)');
        if (openModal) {
          const closeBtn = openModal.querySelector('[data-close-modal]');
          closeBtn?.click();
        }
      }

      // Handle button activation with Enter/Space
      if ((e.key === 'Enter' || e.key === ' ') && 
          e.target.matches('[role="button"], button')) {
        e.preventDefault();
        e.target.click();
      }
    });
  },

  setupFocusManagement() {
    // Trap focus in modals
    document.querySelectorAll('[data-modal]').forEach(modal => {
      modal.addEventListener('keydown', (e) => {
        if (e.key !== 'Tab') return;
        
        const focusable = modal.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          last.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      });
    });

    // Return focus to trigger when modal closes
    let lastFocusedElement = null;
    
    document.addEventListener('focusin', () => {
      lastFocusedElement = document.activeElement;
    });

    document.querySelectorAll('[data-modal]').forEach(modal => {
      const modalId = modal.id;
      const trigger = document.querySelector(`[data-target="${modalId}"]`);
      
      if (trigger) {
        modal.addEventListener('hidden', () => {
          trigger.focus();
        });
      }
    });
  }
};

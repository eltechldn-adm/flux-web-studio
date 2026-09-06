/**
 * ============================================================
 * Build Explorer Logic (Progressive Enhancement)
 * ============================================================
 */

const explorerData = {
  admin: [
    {
      title: "Custom Business App",
      desc: "A centralized platform tailored to how your team actually works, eliminating spreadsheets.",
      category: "business-operations"
    },
    {
      title: "Workflow Automation",
      desc: "Scripts and API integrations that move data between your existing tools silently and instantly.",
      category: "automation"
    }
  ],
  data: [
    {
      title: "Admin Dashboard",
      desc: "A secure internal portal for staff to manage records, users, and tasks without clicking through ten different screens.",
      category: "internal-tools"
    },
    {
      title: "CRM System",
      desc: "A customer database stripped of bloat, customised exactly to your sales pipeline.",
      category: "business-operations"
    }
  ],
  login: [
    {
      title: "Customer Portal",
      desc: "A branded, secure environment where your clients can view their documents, status, and account details.",
      category: "saas"
    }
  ],
  saas: [
    {
      title: "SaaS MVP",
      desc: "A Minimum Viable Product built for real users. We handle the auth, database, and core features so you can launch faster.",
      category: "saas"
    }
  ],
  ai: [
    {
      title: "AI Knowledge Assistant",
      desc: "Internal chatbots that can query and summarise your secure company documents.",
      category: "ai"
    },
    {
      title: "AI-Powered Application",
      desc: "A custom tool wrapped around an LLM to provide industry-specific document analysis or generation.",
      category: "ai"
    }
  ],
  reports: [
    {
      title: "Analytics Dashboard",
      desc: "Live, visual reporting that pulls from all your data sources into one cohesive, understandable view.",
      category: "analytics"
    }
  ],
  booking: [
    {
      title: "Booking Platform",
      desc: "A streamlined booking flow that syncs directly with your calendars and payment provider.",
      category: "customer-products"
    }
  ],
  notsure: [
    {
      title: "Free Project Fit Check",
      desc: "Tell us what's slowing you down. We'll review the problem and tell you what type of system we'd recommend.",
      category: "general"
    }
  ]
};

function initBuildExplorer() {
  const container = document.getElementById('build-explorer');
  if (!container) return;

  const buttons = container.querySelectorAll('.be-option');
  const resultsArea = document.getElementById('be-results-area');
  
  if (!buttons.length || !resultsArea) return;

  function renderResults(targetKey) {
    const data = explorerData[targetKey];
    if (!data) return;

    resultsArea.innerHTML = '';
    
    data.forEach(rec => {
      const card = document.createElement('div');
      card.className = 'be-result-card';
      // Basic styling matching previous dynamic setup, but relying on CSS where possible
      card.style.background = 'var(--color-white)';
      card.style.padding = '1.5rem';
      card.style.borderRadius = 'var(--radius-md)';
      card.style.border = '1px solid var(--border-subtle)';
      card.style.marginBottom = '1rem';
      
      card.innerHTML = `
        <div class="be-result-title" style="font-weight: 700; color: var(--color-obsidian); margin-bottom: 0.5rem;">${rec.title}</div>
        <div class="be-result-desc" style="color: var(--color-text-muted); font-size: 0.9375rem;">${rec.desc}</div>
      `;
      resultsArea.appendChild(card);
    });

    const cta = document.createElement('a');
    cta.href = `/project-brief.html?category=${encodeURIComponent(data[0].category)}`;
    cta.className = 'btn btn--primary';
    cta.style.marginTop = '1rem';
    cta.textContent = targetKey === 'notsure' ? 'Get a Free Project Fit Check' : 'Get My Project Recommendation';
    resultsArea.appendChild(cta);
    
    // Announce to screen readers
    resultsArea.setAttribute('aria-live', 'polite');
  }

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active state from all
      buttons.forEach(b => {
        b.classList.remove('btn--primary');
        b.classList.add('btn--outline');
        b.setAttribute('aria-pressed', 'false');
      });
      
      // Set active state on clicked
      btn.classList.remove('btn--outline');
      btn.classList.add('btn--primary');
      btn.setAttribute('aria-pressed', 'true');
      
      const target = btn.getAttribute('data-be-target');
      if (target) {
        renderResults(target);
      }
    });
  });

  // Select first by default if JavaScript is enabled
  buttons[0].click();
}

document.addEventListener('DOMContentLoaded', initBuildExplorer);

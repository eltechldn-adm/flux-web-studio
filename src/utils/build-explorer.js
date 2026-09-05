/**
 * ============================================================
 * Build Explorer Logic
 * ============================================================
 */

const explorerData = [
  {
    problem: "I'm losing time to admin",
    recommendations: [
      {
        title: "Custom Business App",
        desc: "A centralized platform tailored to how your team actually works, eliminating spreadsheets.",
        category: "business-operations"
      },
      {
        title: "Workflow Automation",
        desc: "Scripts and API integrations that move data between your existing tools silently and instantly.",
        category: "automation"
      },
      {
        title: "Admin Dashboard",
        desc: "A secure internal portal for staff to manage records, users, and tasks without clicking through ten different screens.",
        category: "internal-tools"
      }
    ]
  },
  {
    problem: "I need my customers to log in",
    recommendations: [
      {
        title: "Customer Portal",
        desc: "A branded, secure environment where your clients can view their documents, status, and account details.",
        category: "saas"
      },
      {
        title: "Booking Platform",
        desc: "A streamlined booking flow that syncs directly with your calendars and payment provider.",
        category: "customer-products"
      }
    ]
  },
  {
    problem: "I have a SaaS or software idea",
    recommendations: [
      {
        title: "SaaS MVP",
        desc: "A Minimum Viable Product built for real users. We handle the auth, database, and core features so you can launch faster.",
        category: "saas"
      },
      {
        title: "AI-Powered Application",
        desc: "A custom tool wrapped around an LLM to provide industry-specific document analysis, generation, or conversational agents.",
        category: "ai"
      }
    ]
  },
  {
    problem: "I need better reporting",
    recommendations: [
      {
        title: "Analytics Dashboard",
        desc: "Live, visual reporting that pulls from all your data sources into one cohesive, understandable view.",
        category: "analytics"
      },
      {
        title: "Decision Tools / Calculators",
        desc: "Complex pricing or data calculators built into simple interfaces for your team or customers.",
        category: "analytics"
      }
    ]
  }
];

function initBuildExplorer() {
  const container = document.getElementById('build-explorer');
  if (!container) return;

  const optionsList = container.querySelector('.be-options');
  const resultsArea = container.querySelector('.be-results-area');

  function renderResults(problemText) {
    const data = explorerData.find(d => d.problem === problemText);
    if (!data) return;

    resultsArea.innerHTML = '';
    
    data.recommendations.forEach(rec => {
      const card = document.createElement('div');
      card.className = 'be-result-card';
      card.innerHTML = `
        <div class="be-result-title">${rec.title}</div>
        <div class="be-result-desc">${rec.desc}</div>
      `;
      resultsArea.appendChild(card);
    });

    const cta = document.createElement('a');
    cta.href = `/project-brief.html?category=${encodeURIComponent(data.recommendations[0].category)}`;
    cta.className = 'btn btn--primary';
    cta.style.marginTop = '1rem';
    cta.textContent = 'Get My Project Recommendation';
    resultsArea.appendChild(cta);
  }

  explorerData.forEach((item, index) => {
    const btn = document.createElement('button');
    btn.className = 'be-option';
    btn.innerHTML = `<span>${item.problem}</span> <span>→</span>`;
    
    btn.addEventListener('click', () => {
      document.querySelectorAll('.be-option').forEach(b => b.classList.remove('is-selected'));
      btn.classList.add('is-selected');
      renderResults(item.problem);
    });

    optionsList.appendChild(btn);

    // Select first by default
    if (index === 0) {
      btn.classList.add('is-selected');
      renderResults(item.problem);
    }
  });
}

document.addEventListener('DOMContentLoaded', initBuildExplorer);

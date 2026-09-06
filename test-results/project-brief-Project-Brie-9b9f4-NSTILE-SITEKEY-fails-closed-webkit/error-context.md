# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: project-brief.spec.js >> Project Brief Form E2E >> Production config missing TURNSTILE_SITEKEY fails closed
- Location: tests/project-brief.spec.js:284:7

# Error details

```
AggregateError: apiRequestContext.get: connect ECONNREFUSED ::1:8788
connect ECONNREFUSED 127.0.0.1:8788
Call log:
  - → GET http://localhost:8788/api/config
    - user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.6 Safari/605.1.15
    - accept: */*
    - accept-encoding: gzip,deflate,br

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - banner:
    - link "Skip to main content" [ref=e2]:
      - /url: "#main-content"
    - navigation "Main navigation" [ref=e3]:
      - generic [ref=e4]:
        - link "Flux Web Studio — Home" [ref=e5]:
          - /url: index.html
          - text: Flux Web Studio
        - generic [ref=e6]:
          - list [ref=e7]:
            - listitem [ref=e8]:
              - link "What We Build" [ref=e9]:
                - /url: what-we-build.html
            - listitem [ref=e10]:
              - link "How It Works" [ref=e11]:
                - /url: how-it-works.html
            - listitem [ref=e12]:
              - link "Pricing" [ref=e13]:
                - /url: pricing.html
            - listitem [ref=e14]:
              - link "Work" [ref=e15]:
                - /url: work.html
            - listitem [ref=e16]:
              - link "About" [ref=e17]:
                - /url: about.html
          - link "Discuss Your Idea" [ref=e19] [cursor=pointer]:
            - /url: project-brief.html
  - main [ref=e20]:
    - generic [ref=e21]:
      - generic [ref=e22]:
        - heading "Tell us what you're trying to solve." [level=1] [ref=e23]
        - paragraph [ref=e24]: You don't need a technical specification. Tell us what's not working, what you'd like to build, or what you'd like your current systems to do better.
      - group "Project Enquiry Details" [ref=e27]:
        - generic [ref=e29]:
          - generic [ref=e30]: What can we help you with? *
          - radiogroup [ref=e31]:
            - generic [ref=e32] [cursor=pointer]:
              - radio "Custom Business App"
              - generic [ref=e33]: Custom Business App
            - generic [ref=e34] [cursor=pointer]:
              - radio "SaaS / Product Idea"
              - generic [ref=e35]: SaaS / Product Idea
            - generic [ref=e36] [cursor=pointer]:
              - radio "AI Application"
              - generic [ref=e37]: AI Application
            - generic [ref=e38] [cursor=pointer]:
              - radio "Dashboard / Analytics"
              - generic [ref=e39]: Dashboard / Analytics
            - generic [ref=e40] [cursor=pointer]:
              - radio "Automation / Integration"
              - generic [ref=e41]: Automation / Integration
            - generic [ref=e42] [cursor=pointer]:
              - radio "Customer Portal"
              - generic [ref=e43]: Customer Portal
            - generic [ref=e44] [cursor=pointer]:
              - radio "Something Else"
              - generic [ref=e45]: Something Else
            - generic [ref=e46] [cursor=pointer]:
              - radio "I'm Not Sure"
              - generic [ref=e47]: I'm Not Sure
        - generic [ref=e48]:
          - generic [ref=e49]: What would you like to build or improve? *
          - generic [ref=e50]: Tell us what's happening today and what you'd like to happen instead.
          - textbox "What would you like to build or improve?" [ref=e51]
        - generic [ref=e52]:
          - generic [ref=e53]:
            - generic [ref=e54]: Approximate budget — optional
            - combobox "Approximate budget — optional" [ref=e55]:
              - option "Please select..." [selected]
              - option "Under £2,000"
              - option "£2,000–£5,000"
              - option "£5,000–£10,000"
              - option "£10,000+"
              - option "Not sure yet"
          - generic [ref=e56]:
            - generic [ref=e57]: Ideal timeframe *
            - combobox "Ideal timeframe" [ref=e58]:
              - option "Please select..." [selected]
              - option "As soon as practical"
              - option "1–2 months"
              - option "3–6 months"
              - option "Just exploring"
              - option "Not sure yet"
        - generic [ref=e59]:
          - generic [ref=e60]:
            - generic [ref=e61]: Your name *
            - textbox "Your name" [ref=e62]
          - generic [ref=e63]:
            - generic [ref=e64]: Email address *
            - textbox "Email address" [ref=e65]
        - generic [ref=e66]:
          - generic [ref=e67]: Company or website — optional
          - textbox "Company or website — optional" [ref=e68]
        - button "Send My Project Brief" [ref=e73] [cursor=pointer]
  - contentinfo [ref=e74]:
    - generic [ref=e75]:
      - generic [ref=e76]:
        - link "Flux Web Studio" [ref=e77]:
          - /url: index.html
        - paragraph [ref=e78]: Custom software, AI and automation for modern businesses.
      - paragraph [ref=e80]: © 2026 Flux Web Studio. All rights reserved.
```
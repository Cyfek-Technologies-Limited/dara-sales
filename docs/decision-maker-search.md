# Decision-maker discovery

Prospecting searches use the existing OpenAI web-search integration to discover public LinkedIn person profiles and official company pages. No LinkedIn login, paid enrichment account, or additional environment variable is needed. Enter a role in **Who do you want to reach?**; leaving it blank searches for a relevant purchasing or operational decision maker.

Business identity and customer-fit sources must remain official company pages. Named LinkedIn matches require a returned web-search source and a public excerpt connecting the person's name, title and exact business name. Work channels require a cited company page or that person's public LinkedIn profile and a returned excerpt containing the person's name and channel. Email patterns and private contact details must not be inferred. Search-provider excerpts are evidence for review, not independent employment verification.

Profiles remain visible even when no direct work email or phone is found. Department, group and general company fallbacks are labeled separately; general channels must not be presented as belonging to a named employee. Saving a prospect retains its person and channel source links and fallback labels in provenance.

Public LinkedIn indexing, accessible profile content and current job information vary. Searches may return fewer people or no direct contacts. This uses the existing metered web-search provider and does not make provider usage free. No database migration is required.

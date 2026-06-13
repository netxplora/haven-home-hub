import sys

with open(r"c:\Users\ADMIN\Documents\New Website\haven-home-hub\src\pages\invest\InvestDetail.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Extract Investment Panel
panel_start = content.find('<aside className="lg:sticky lg:top-24 lg:self-start">')
panel_inner_start = content.find('<div className="rounded-xl border border-border/50 bg-card p-6 shadow-card">', panel_start)
panel_end = content.find('</aside>', panel_start)
panel_inner_end = content.rfind('</div>', panel_inner_start, panel_end) + 6 # Wait, there are many nested divs.

# Let's extract exactly lines 419 to 641 from the file content.
lines = content.split('\n')
panel_lines = lines[419:641] # 419 is 0-indexed 418. Let's just find it robustly.

# Better approach: We'll inject renderInvestmentPanel and rewrite the DOM structure.

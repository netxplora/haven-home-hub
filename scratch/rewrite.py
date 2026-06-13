import sys

file_path = r"c:\Users\ADMIN\Documents\New Website\haven-home-hub\src\pages\invest\InvestDetail.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Find the start of the aside panel
start_idx = -1
end_idx = -1
for i, line in enumerate(lines):
    if '<aside className="lg:sticky lg:top-24 lg:self-start">' in line:
        start_idx = i
    if start_idx != -1 and '</aside>' in line:
        end_idx = i
        break

if start_idx == -1 or end_idx == -1:
    print("Could not find aside panel")
    sys.exit(1)

# The content of the panel
panel_content = "".join(lines[start_idx+1:end_idx])

# Find the return statement
return_idx = -1
for i, line in enumerate(lines):
    if '  return (' in line:
        return_idx = i
        break

# Insert renderInvestmentPanel before return
new_lines = lines[:return_idx]
new_lines.append('  const renderInvestmentPanel = () => (\n')
new_lines.append(panel_content)
new_lines.append('  );\n\n')

# Now process the rest, from return down to the end
rest = lines[return_idx:]

# In the rest, we need to modify the grid
# Find: <div className="container-wide grid gap-10 pb-16 lg:grid-cols-[1fr_400px]">
grid_idx = -1
for i, line in enumerate(rest):
    if '<div className="container-wide grid gap-10 pb-16 lg:grid-cols-[1fr_400px]">' in line:
        grid_idx = i
        break

# Left col starts right after grid
left_col_start = -1
for i in range(grid_idx, len(rest)):
    if '        <div>' in rest[i] and '/* LEFT */' in rest[i-1]:
        left_col_start = i
        rest[i] = '        <div className="flex flex-col gap-10">\n          <div>\n'
        break

# Find where the Returns start: <div className="mt-10 rounded-xl border border-border bg-card p-6 shadow-soft">
returns_idx = -1
for i in range(left_col_start, len(rest)):
    if '<div className="mt-10 rounded-xl border border-border bg-card p-6 shadow-soft">' in rest[i]:
        returns_idx = i
        break

# Insert closing div for the Header, then mobile panel, then opening div for the rest
rest.insert(returns_idx, '          </div>\n\n          <div className="block lg:hidden">\n            {renderInvestmentPanel()}\n          </div>\n\n          <div className="space-y-6">\n')

# Find the original aside and replace it
aside_start = -1
for i in range(len(rest)):
    if '<aside className="lg:sticky lg:top-24 lg:self-start">' in rest[i]:
        aside_start = i
        break

aside_end = -1
for i in range(aside_start, len(rest)):
    if '</aside>' in rest[i]:
        aside_end = i
        break

rest[aside_start:aside_end+1] = [
    '          </div>\n', # Close the space-y-6 div
    '        </div>\n\n', # Close the left flex col div
    '        {/* RIGHT — Investment panel */}\n',
    '        <aside className="hidden lg:block lg:sticky lg:top-24 lg:self-start">\n',
    '          {renderInvestmentPanel()}\n',
    '        </aside>\n'
]

# Write back
new_lines.extend(rest)
with open(file_path, "w", encoding="utf-8") as f:
    f.writelines(new_lines)

print("Rewrite successful")

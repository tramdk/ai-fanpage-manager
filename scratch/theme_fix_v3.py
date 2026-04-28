import os

replacements = {
    'bg-slate-800': 'bg-accent-bg',
    'bg-slate-700': 'bg-accent-bg',
    'border-slate-700': 'border-card-border',
    'border-slate-800': 'border-card-border',
    'hover:bg-slate-700': 'hover:bg-accent-bg',
    'hover:bg-slate-800': 'hover:bg-accent-bg',
    'text-slate-300': 'text-text-secondary',
    'text-slate-400': 'text-text-secondary',
}

src_dir = 'c:\\Users\\T\\.gemini\\antigravity\\scratch\\fanpage-ai-manager\\src'

for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content = content
            for old, new in replacements.items():
                new_content = new_content.replace(old, new)
            
            if new_content != content:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated: {path}")

import os

replacements = {
    'bg-slate-900': 'bg-card-bg',
    'bg-slate-950': 'bg-app-bg',
    'border-slate-800': 'border-card-border',
    'border-slate-900': 'border-card-border',
    'text-slate-50': 'text-text-primary',
    'text-slate-200': 'text-text-primary',
    'text-slate-300': 'text-text-primary',
    'text-slate-400': 'text-text-secondary',
    'text-slate-500': 'text-text-secondary',
    'text-slate-600': 'text-text-secondary',
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

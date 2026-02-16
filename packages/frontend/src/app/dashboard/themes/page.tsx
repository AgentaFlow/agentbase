export default function ThemesPage() {
  const mockThemes = [
    { name: 'Default', slug: 'default', desc: 'Clean minimal theme for any AI app', color: '#4c6ef5' },
    { name: 'Dark Pro', slug: 'dark-pro', desc: 'Professional dark theme with modern aesthetics', color: '#1e293b' },
    { name: 'Nature', slug: 'nature', desc: 'Warm earth tones inspired by the outdoors', color: '#059669' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Themes</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockThemes.map((theme) => (
          <div key={theme.slug} className="bg-white rounded-xl border overflow-hidden hover:shadow-md transition-shadow">
            <div className="h-32" style={{ backgroundColor: theme.color }} />
            <div className="p-5">
              <h3 className="font-semibold text-slate-900 mb-1">{theme.name}</h3>
              <p className="text-sm text-slate-500 mb-3">{theme.desc}</p>
              <button className="text-sm text-brand-600 hover:text-brand-700 font-medium">
                Apply Theme
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

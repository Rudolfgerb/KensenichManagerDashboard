import React, { useState } from 'react';
import './ContentPlan.css';

interface ContentIdeaFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const ContentIdeaForm: React.FC<ContentIdeaFormProps> = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    platform: '',
    category: '',
    priority: 0,
    thumbnail_url: '',
    notes: '',
    target_date: ''
  });

  // Default element types
  const defaultElementTypes = [
    { type: 'hook', label: '🎣 Hook', description: 'Attention-grabbing opener' },
    { type: 'caption', label: '📝 Caption', description: 'Text description/caption' },
    { type: 'text', label: '💬 Text', description: 'Main text content' },
    { type: 'voiceover', label: '🎤 Voiceover', description: 'Audio narration script' },
    { type: 'script', label: '📜 Script', description: 'Full video/content script' },
    { type: 'transitions', label: '🔄 Transitions', description: 'Scene transitions' },
    { type: 'animations', label: '✨ Animations', description: 'Motion graphics' },
    { type: 'stickers', label: '🎨 Stickers', description: 'Overlay graphics/stickers' },
    { type: 'videos', label: '🎬 Videos', description: 'Video clips/footage' },
    { type: 'music', label: '🎵 Music', description: 'Background music/sound' },
  ];

  const [selectedElements, setSelectedElements] = useState<Set<string>>(new Set());
  const [customElements, setCustomElements] = useState<Array<{ type: string; label: string; description: string }>>([]);
  const [newElementType, setNewElementType] = useState('');
  const [newElementLabel, setNewElementLabel] = useState('');
  const [newElementDescription, setNewElementDescription] = useState('');
  const [showCustomElementForm, setShowCustomElementForm] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'priority' ? parseInt(value) || 0 : value
    }));
  };

  const toggleElement = (elementType: string) => {
    const newSelected = new Set(selectedElements);
    if (newSelected.has(elementType)) {
      newSelected.delete(elementType);
    } else {
      newSelected.add(elementType);
    }
    setSelectedElements(newSelected);
  };

  const handleAddCustomElement = () => {
    if (!newElementType || !newElementLabel) {
      alert('Bitte Typ und Label eingeben!');
      return;
    }

    const customElement = {
      type: newElementType.toLowerCase().replace(/\s+/g, '_'),
      label: newElementLabel,
      description: newElementDescription || ''
    };

    setCustomElements([...customElements, customElement]);
    setSelectedElements(new Set([...selectedElements, customElement.type]));

    // Reset form
    setNewElementType('');
    setNewElementLabel('');
    setNewElementDescription('');
    setShowCustomElementForm(false);
  };

  const removeCustomElement = (index: number) => {
    const element = customElements[index];
    const newCustomElements = customElements.filter((_, i) => i !== index);
    setCustomElements(newCustomElements);

    // Also remove from selected
    const newSelected = new Set(selectedElements);
    newSelected.delete(element.type);
    setSelectedElements(newSelected);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedElements.size === 0) {
      alert('Bitte wähle mindestens ein Content-Element aus!');
      return;
    }

    // Build elements array
    const allElements = [...defaultElementTypes, ...customElements];
    const elements = Array.from(selectedElements).map((elementType, index) => {
      const elementDef = allElements.find(e => e.type === elementType);
      return {
        element_type: elementType,
        title: elementDef?.label || elementType,
        order_index: index,
        status: 'missing'
      };
    });

    // Submit with elements
    onSubmit({
      ...formData,
      elements
    });
  };

  const allElements = [...defaultElementTypes, ...customElements];

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>💡 Neue Content-Idee</h2>
          <button className="modal-close" onClick={onCancel}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="content-idea-form">
          {/* Basic Info */}
          <div className="form-section">
            <h3>📋 Grundinformationen</h3>

            <div className="form-group">
              <label htmlFor="title">Titel *</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="z.B. Tutorial: React Hooks erklärt"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Beschreibung</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Kurze Beschreibung der Content-Idee..."
                rows={3}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="platform">Plattform</label>
                <select
                  id="platform"
                  name="platform"
                  value={formData.platform}
                  onChange={handleChange}
                >
                  <option value="">Wählen...</option>
                  <option value="youtube">📺 YouTube</option>
                  <option value="instagram">📸 Instagram</option>
                  <option value="tiktok">🎵 TikTok</option>
                  <option value="twitter">🐦 Twitter</option>
                  <option value="linkedin">💼 LinkedIn</option>
                  <option value="facebook">👥 Facebook</option>
                  <option value="blog">📝 Blog</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="category">Kategorie</label>
                <input
                  type="text"
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  placeholder="z.B. Tutorial, Review, Vlog"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="priority">Priorität</label>
                <select
                  id="priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                >
                  <option value="0">Keine</option>
                  <option value="1">⭐ Niedrig</option>
                  <option value="2">⭐⭐ Mittel</option>
                  <option value="3">⭐⭐⭐ Hoch</option>
                  <option value="4">⭐⭐⭐⭐ Sehr Hoch</option>
                  <option value="5">⭐⭐⭐⭐⭐ Kritisch</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="target_date">Ziel-Datum</label>
                <input
                  type="date"
                  id="target_date"
                  name="target_date"
                  value={formData.target_date}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Content Elements Selection */}
          <div className="form-section">
            <div className="section-header-with-action">
              <h3>🧩 Benötigte Content-Elemente *</h3>
              <button
                type="button"
                className="btn-add-custom"
                onClick={() => setShowCustomElementForm(!showCustomElementForm)}
              >
                {showCustomElementForm ? '❌ Abbrechen' : '➕ Custom Element'}
              </button>
            </div>

            <p className="form-hint">
              Wähle die Elemente aus, die du für diesen Content brauchst
            </p>

            {/* Custom Element Form */}
            {showCustomElementForm && (
              <div className="custom-element-form">
                <h4>✨ Neues Custom Element</h4>
                <div className="custom-element-inputs">
                  <input
                    type="text"
                    placeholder="Element-Typ (z.B. scene_1, location_outdoor)"
                    value={newElementType}
                    onChange={(e) => setNewElementType(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Label (z.B. 🎬 Szene 1, 📍 Outdoor Location)"
                    value={newElementLabel}
                    onChange={(e) => setNewElementLabel(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Beschreibung (optional)"
                    value={newElementDescription}
                    onChange={(e) => setNewElementDescription(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-add-element"
                    onClick={handleAddCustomElement}
                  >
                    ✅ Hinzufügen
                  </button>
                </div>
              </div>
            )}

            {/* Elements Grid */}
            <div className="elements-selection-grid">
              {allElements.map((element, index) => {
                const isCustom = index >= defaultElementTypes.length;
                return (
                  <div
                    key={element.type}
                    className={`element-checkbox ${selectedElements.has(element.type) ? 'selected' : ''} ${isCustom ? 'custom' : ''}`}
                    onClick={() => toggleElement(element.type)}
                  >
                    <div className="checkbox-wrapper">
                      <input
                        type="checkbox"
                        checked={selectedElements.has(element.type)}
                        onChange={() => {}}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="element-info">
                        <div className="element-label">{element.label}</div>
                        {element.description && (
                          <div className="element-description">{element.description}</div>
                        )}
                      </div>
                    </div>
                    {isCustom && (
                      <button
                        type="button"
                        className="btn-remove-custom"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeCustomElement(index - defaultElementTypes.length);
                        }}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="selected-count">
              ✅ {selectedElements.size} Element{selectedElements.size !== 1 ? 'e' : ''} ausgewählt
            </div>
          </div>

          {/* Additional Info */}
          <div className="form-section">
            <h3>📎 Zusätzliche Informationen</h3>

            <div className="form-group">
              <label htmlFor="thumbnail_url">Thumbnail URL</label>
              <input
                type="url"
                id="thumbnail_url"
                name="thumbnail_url"
                value={formData.thumbnail_url}
                onChange={handleChange}
                placeholder="https://..."
              />
            </div>

            <div className="form-group">
              <label htmlFor="notes">Notizen</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Zusätzliche Notizen, Ideen, Links..."
                rows={3}
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onCancel}>
              Abbrechen
            </button>
            <button type="submit" className="btn-submit">
              ✅ Idee mit {selectedElements.size} Elementen erstellen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContentIdeaForm;

import { useEffect, useState } from 'react';
import { supabase, Entity, EntityMetric, FrictionReport } from './lib/supabase';
import { AlertCircle, Building2, FileText } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState<'submit' | 'view'>('submit');
  const [entities, setEntities] = useState<Entity[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [metrics, setMetrics] = useState<EntityMetric[]>([]);
  const [confirmationMessage, setConfirmationMessage] = useState('');

  const [formData, setFormData] = useState<FrictionReport>({
    entity_id: '',
    service_task: '',
    friction_type: 'Delay',
    time_wasted_hours: 0,
    description: ''
  });

  useEffect(() => {
    loadEntities();
    const interval = setInterval(loadEntities, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (entities.length > 0 && !formData.entity_id) {
      const municipalCouncil = entities.find(e => e.name === 'Municipal Council');
      if (municipalCouncil) {
        setFormData(prev => ({ ...prev, entity_id: municipalCouncil.id }));
        loadEntityDetails(municipalCouncil.id);
      }
    }
  }, [entities]);

  const loadEntities = async () => {
    const { data } = await supabase
      .from('entities')
      .select('*')
      .order('name');
    if (data) setEntities(data);
  };

  const loadEntityDetails = async (entityId: string) => {
    const [entityResponse, metricsResponse] = await Promise.all([
      supabase.from('entities').select('*').eq('id', entityId).maybeSingle(),
      supabase.from('entity_metrics').select('*').eq('entity_id', entityId)
    ]);

    if (entityResponse.data) setSelectedEntity(entityResponse.data);
    if (metricsResponse.data) setMetrics(metricsResponse.data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmationMessage('');

    if (!formData.entity_id) {
      setConfirmationMessage('Error: Please select an institution');
      return;
    }

    if (!formData.description.trim()) {
      setConfirmationMessage('Error: Please provide a brief description');
      return;
    }

    const { error: reportError } = await supabase
      .from('friction_reports')
      .insert([formData]);

    if (reportError) {
      setConfirmationMessage(`Error submitting report: ${reportError.message}`);
      return;
    }

    const { data: currentEntity } = await supabase
      .from('entities')
      .select('psc_score')
      .eq('id', formData.entity_id)
      .maybeSingle();

    if (!currentEntity) {
      setConfirmationMessage('Error: Institution not found');
      return;
    }

    const baseReduction = 0.5;
    const timeReduction = Math.min(formData.time_wasted_hours * 0.15, 1.5);
    const descriptionReduction = Math.min(formData.description.length / 200, 0.5);
    const totalReduction = Math.min(baseReduction + timeReduction + descriptionReduction, 2.0);

    const newScore = Math.max(0, parseFloat((currentEntity.psc_score - totalReduction).toFixed(1)));

    const { error: updateError } = await supabase
      .from('entities')
      .update({
        psc_score: newScore,
        updated_at: new Date().toISOString()
      })
      .eq('id', formData.entity_id);

    if (updateError) {
      setConfirmationMessage(`Error updating score: ${updateError.message}`);
      return;
    }

    const feedbackMetric = metrics.find(m => m.metric_name === 'Citizen Feedback Rating');
    if (feedbackMetric) {
      const currentValue = parseInt(feedbackMetric.metric_value.match(/\d+/)?.[0] || '50');
      const newValue = Math.max(0, currentValue - 2);
      const newLabel = newValue < 40 ? 'Very Poor' : newValue < 60 ? 'Poor' : 'Fair';

      await supabase
        .from('entity_metrics')
        .update({ metric_value: `${newLabel} (${newValue}%)` })
        .eq('id', feedbackMetric.id);
    }

    await loadEntities();
    await loadEntityDetails(formData.entity_id);

    const entityName = entities.find(e => e.id === formData.entity_id)?.name;
    setConfirmationMessage(`Friction Report Submitted. ${entityName}'s PSC Score is now: ${newScore.toFixed(1)}`);

    setFormData(prev => ({
      ...prev,
      service_task: '',
      time_wasted_hours: 0,
      description: ''
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">
            Friction Reporter & PSC Viewer
          </h1>
          <p className="text-slate-600">Incentive Alignment Ledger (IAL) - Hoobit Ideathon MVP</p>
        </header>

        <div className="bg-white rounded-lg shadow-md">
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('submit')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === 'submit'
                  ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <FileText size={20} />
              Submit Report
            </button>
            <button
              onClick={() => setActiveTab('view')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === 'view'
                  ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <Building2 size={20} />
              Institutions
            </button>
          </div>

          <div className="p-8">
            {activeTab === 'submit' ? (
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <AlertCircle className="text-blue-600" size={24} />
                  <h2 className="text-2xl font-semibold text-slate-800">Report Friction</h2>
                </div>

                <form onSubmit={handleSubmit} className="max-w-md space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Institution
                    </label>
                    <select
                      value={formData.entity_id}
                      onChange={(e) => {
                        setFormData({ ...formData, entity_id: e.target.value });
                        loadEntityDetails(e.target.value);
                      }}
                      className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select an institution</option>
                      {entities.map(entity => (
                        <option key={entity.id} value={entity.id}>
                          {entity.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Service/Task
                    </label>
                    <input
                      type="text"
                      value={formData.service_task}
                      onChange={(e) => setFormData({ ...formData, service_task: e.target.value })}
                      placeholder="e.g., Land Document Request"
                      className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Friction Type
                    </label>
                    <select
                      value={formData.friction_type}
                      onChange={(e) => setFormData({ ...formData, friction_type: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="Delay">Delay</option>
                      <option value="Opaqueness">Opaqueness</option>
                      <option value="Inaccessible Form">Inaccessible Form</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Brief Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe the friction you faced..."
                      className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Time Wasted (Hours)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={formData.time_wasted_hours}
                      onChange={(e) => setFormData({ ...formData, time_wasted_hours: parseFloat(e.target.value) })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-md transition-colors"
                  >
                    Submit Friction Report
                  </button>
                </form>

                {confirmationMessage && (
                  <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md max-w-md">
                    <p className="text-green-800 text-sm font-medium">{confirmationMessage}</p>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <Building2 className="text-slate-600" size={24} />
                  <h2 className="text-2xl font-semibold text-slate-800">All Institutions</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {entities.map(entity => (
                    <div
                      key={entity.id}
                      className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border border-slate-200 p-6 hover:shadow-lg transition-shadow"
                    >
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold text-slate-800 mb-2">
                          {entity.name}
                        </h3>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold text-slate-800">
                            {entity.psc_score}
                          </span>
                          <span className="text-slate-500">/ 10</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Public Service Commitment Score</p>
                      </div>

                      <div className="mb-4 pt-4 border-t border-slate-200">
                        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                          Status
                        </p>
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              entity.psc_score >= 8
                                ? 'bg-green-500'
                                : entity.psc_score >= 6
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                            }`}
                          />
                          <span className="text-sm font-medium text-slate-700">
                            {entity.psc_score >= 8
                              ? 'Excellent'
                              : entity.psc_score >= 6
                                ? 'Good'
                                : 'Needs Improvement'}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => loadEntityDetails(entity.id)}
                        className="w-full mt-4 px-3 py-2 bg-blue-100 text-blue-600 font-medium rounded-md hover:bg-blue-200 transition-colors text-sm"
                      >
                        View Details
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {selectedEntity && activeTab === 'view' && (
          <div className="mt-8 bg-white rounded-lg shadow-md p-8">
            <div className="mb-6">
              <h3 className="text-2xl font-semibold text-slate-800 mb-4">
                {selectedEntity.name} - Detailed View
              </h3>

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-sm text-slate-600 mb-2">PSC Score</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-slate-800">
                      {selectedEntity.psc_score}
                    </span>
                    <span className="text-slate-500">/ 10</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-2">Performance Status</p>
                  <p className="text-xl font-semibold text-slate-800">
                    {selectedEntity.psc_score >= 8
                      ? 'Excellent'
                      : selectedEntity.psc_score >= 6
                        ? 'Good'
                        : 'Needs Improvement'}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-slate-700 mb-4">Performance Metrics</h4>
              <div className="space-y-3">
                {metrics.map(metric => (
                  <div key={metric.id} className="bg-slate-50 rounded-md p-4 border border-slate-200">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-slate-700">{metric.metric_name}</span>
                      <span className="text-sm text-slate-600">{metric.metric_value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

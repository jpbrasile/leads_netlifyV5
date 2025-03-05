import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient';
import './App.css';
import { runSmartQuery } from './services/smartQueryService';

interface Entreprise {
  entreprise_id: number;
  nom_entreprise: string;
  secteur_activite: string;
  taille_entreprise?: string;
  adresse?: string;
  site_web?: string;
  strategie_entreprise?: string;
  notes?: string;
  date_creation: string;
  date_mise_a_jour: string;
}

interface Prospect {
  prospect_id: number;
  nom: string;
  prenom: string;
  entreprise_id?: string;
  email: string;
  telephone?: string;
  fonction?: string;
  notes?: string;
  date_creation?: string;
  date_mise_a_jour?: string;
}

interface HistoriqueAppel {
  appel_id: number;
  prospect_id: number;
  date_appel: string;
  notes?: string;
  prospect_nom?: string; // For UI display only
}

interface HistoriqueMeeting {
  meeting_id: number;
  prospect_id: number;
  date_meeting: string;
  notes?: string;
  participants: string;
  prospect_nom?: string; // For UI display only
}

interface Tache {
  tache_id: number; // Primary key
  prospect_id?: number; // Nullable
  libelle?: string; // Nullable
  status?: string; // Nullable
  date_objectif?: string; // Nullable
  date_creation?: string; // Nullable, defaults to CURRENT_TIMESTAMP
  date_mise_a_jour?: string; // Nullable, defaults to CURRENT_TIMESTAMP
  notes?: string; // Nullable
}

interface Email {
  email_id: number;
  prospect_id?: number;
  date_email?: string;
  expediteur?: string;
  destinataire?: string;
  sujet?: string;
  corps?: string;
  prospect_nom?: string; // For UI display
}







function App() {
// Add a new activeTab state option
  const [activeTab, setActiveTab] = useState<
    'entreprises' | 'prospects' | 'historique_appels' | 'historique_meetings' | 'taches' | 'emails' | 'smart_query'
  >('entreprises');

  const [smartQueryInput, setSmartQueryInput] = useState("");
  const [smartQueryResult, setSmartQueryResult] = useState<{
    sql: string;
    validation: [boolean, string];
    queryResults: any;
    summary: string;
  } | null>(null);
  const [loadingSmartQuery, setLoadingSmartQuery] = useState(false);
  //const handleRunSmartQuery = async () => { /* ... */ };

  // State for "entreprises" table
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  const [formEntreprises, setFormEntreprises] = useState({
    nom_entreprise: '',
    secteur_activite: '',
    taille_entreprise: '',
    adresse: '',
    site_web: '',
    strategie_entreprise: '',
    notes: '',
  });
  const [editingEntreprises, setEditingEntreprises] = useState<string | null>(null);

  // State for "prospects" table
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [formProspects, setFormProspects] = useState({
    nom: '',
    prenom: '',
    email: '',
    nom_entreprise: '',
    telephone: '',
    fonction: '',
    notes: '',
  });
  const [editingProspects, setEditingProspects] = useState<string | null>(null);

  const [emails, setEmails] = useState<Email[]>([]);
  const [formEmails, setFormEmails] = useState({
    nom_prospect: '',
    date_email: '',
    expediteur: '',
    destinataire: '',
    sujet: '',
    corps: '',
  });
  const [editingEmails, setEditingEmails] = useState<string | null>(null);


  // Generic data fetching function
  const fetchData = async (table: string, setRecords: (records: any[]) => void) => {
    let orderField = 'date_creation';
    if (table === 'historique_appels') {
      orderField = 'date_appel';
    }
    if (table === 'historique_meetings') {
      orderField = 'date_meeting';
    }
    if (table === 'historique_emails') {
      orderField = 'date_email';
    }
    if (table === 'historique_appels' || table === 'historique_meetings' ||
      table === 'historique_emails') {
      // For both historique_appels and historique_meetings, join with prospects to get nom_prospect for display
      const { data, error } = await supabase
        .from(table)
        .select(`
          *,
          prospects:prospect_id (nom)
        `)
        .order(orderField, { ascending: false });
      
      if (error) {
        console.error(`Error fetching ${table}:`, error);
      } else {
        // Transform data to include prospect_nom for easier display
        const enhancedData = data.map((record: any) => ({
          ...record,
          prospect_nom: record.prospects ? record.prospects.nom : 'Unknown',
        }));
        setRecords(enhancedData);
      }
    } else {
      // Normal fetch for other tables
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order(orderField, { ascending: false });
      if (error) console.error(`Error fetching ${table}:`, error);
      else setRecords(data);
    }
  };

  // State for "historique_appels" table
  const [historiqueAppels, setHistoriqueAppels] = useState<HistoriqueAppel[]>([]);
  const [formHistoriqueAppels, setFormHistoriqueAppels] = useState({
    nom_prospect: '',
    date_appel: '',
    notes: '',
  });
  const [editingHistoriqueAppels, setEditingHistoriqueAppels] = useState<string | null>(null);

  // State for "historique_meetings" table
  const [historiqueMeetings, setHistoriqueMeetings] = useState<HistoriqueMeeting[]>([]);
  const [formHistoriqueMeetings, setFormHistoriqueMeetings] = useState({
    nom_prospect: '',
    date_meeting: '',
    participants: '',
    notes: '',
  });
  const [editingHistoriqueMeetings, setEditingHistoriqueMeetings] = useState<string | null>(null);

  // State for "taches" table
  const [taches, setTaches] = useState<Tache[]>([]);
  const [formTaches, setFormTaches] = useState({
    prospect_id: '',
    libelle: '',
    status: '',
    date_objectif: '',
    notes: '',
  });
  const [editingTaches, setEditingTaches] = useState<string | null>(null);

  const handleRunSmartQuery = async () => {
    if (!smartQueryInput.trim()) {
      alert("Please enter a query.");
      return;
    }
    setLoadingSmartQuery(true);
  
    try {
      // Call your smart query service function. This function 
      // should perform the chain: generateSQL → validateSQLInSupabase → executeQuery → generateSummary.
      const result = await runSmartQuery(smartQueryInput);
      // Expected result: { sql, validation: [isValid, validationMsg], queryResults, summary }
      setSmartQueryResult(result);
    } catch (err: any) {
      console.error("Error executing smart query:", err);
      alert("Error executing smart query: " + err.message);
    } finally {
      setLoadingSmartQuery(false);
    }
  };


  // Fetch data when active tab changes
  useEffect(() => {
    if (activeTab === 'entreprises') {
      fetchData('entreprises', setEntreprises);
    } else if (activeTab === 'prospects') {
      fetchData('prospects', setProspects);
    } else if (activeTab === 'historique_appels') {
      fetchData('historique_appels', setHistoriqueAppels);
    } else if (activeTab === 'historique_meetings') {
      fetchData('historique_meetings', setHistoriqueMeetings);
    } else if (activeTab === 'taches') {
      fetchData('taches', setTaches);
    } else if (activeTab === 'emails') {
      fetchData('historique_emails', setEmails);
    }
  }, [activeTab]);

  // Generic handleSubmit function for both tables
  const handleSubmitGeneric = async (
    table: string,
    formData: any,
    editingId: string | null,
    setEditing: (id: string | null) => void,
    refreshData: () => void
  ) => {
    const now = new Date().toISOString();
    const payload = { ...formData, date_creation: now, date_mise_a_jour: now };
    if (table === 'prospects') {
      if (formData.nom_entreprise.trim() !== '') {
        const { data: entrepriseData, error: entrepriseError } = await supabase
          .from('entreprises')
          .select('entreprise_id')
          .eq('nom_entreprise', formData.nom_entreprise)
          .single();
        if (entrepriseError || !entrepriseData) {
          alert("Entreprise not found. Please check the company name.");
          return;
        }
        payload.entreprise_id = entrepriseData.entreprise_id;
      } else {
        payload.entreprise_id = null;
      }
      delete payload.nom_entreprise;
    }
    if (table === 'historique_appels' || table === 'historique_meetings' ||
      table === 'historique_emails') {
      if (formData.nom_prospect.trim() !== '') {
        const { data: prospectData, error: prospectError } = await supabase
          .from('prospects')
          .select('prospect_id')
          .eq('nom', formData.nom_prospect)
          .single();
        if (prospectError || !prospectData) {
          alert("Prospect not found. Please check the prospect name.");
          return;
        }
        payload.prospect_id = prospectData.prospect_id;
      } else {
        alert("Prospect name is required.");
        return;
      }
      delete payload.nom_prospect;
      // Remove fields not present in historique_appels schema
      delete payload.date_creation;
      delete payload.date_mise_a_jour;
    }
  
    const idField =
  table === 'entreprises'
    ? 'entreprise_id'
    : table === 'prospects'
    ? 'prospect_id'
    : table === 'historique_appels'
    ? 'appel_id'
    : table === 'historique_meetings'
    ? 'meeting_id'
    : table === 'taches'
    ? 'tache_id'
    : table === 'historique_emails'
    ? 'email_id'
    : '';
    if (editingId) {
      const { error } = await supabase
        .from(table)
        .update(payload)
        .eq(idField, editingId);
      if (error) alert(`Update error in ${table}: ${error.message}`);
      else setEditing(null);
    } else {
      const { error } = await supabase
        .from(table)
        .insert([payload]);
      if (error) alert(`Insertion error in ${table}: ${error.message}`);
    }
    // Refresh data for the table
    if (table === 'entreprises') {
      fetchData(table, setEntreprises);
    } else if (table === 'prospects') {
      fetchData(table, setProspects);
    } else if (table === 'historique_appels') {
      fetchData(table, setHistoriqueAppels);
    } else if (table === 'historique_meetings') {
      fetchData(table, setHistoriqueMeetings);
    } else if (table === 'taches') {
      fetchData(table, setTaches);
    }
  };

  // Generic handleDelete function for all tables
  const handleDeleteGeneric = async (
    table: string,
    id: string,
    refreshData: () => void
  ) => {
    const idField =
      table === 'entreprises'
        ? 'entreprise_id'
        : table === 'prospects'
        ? 'prospect_id'
        : table === 'historique_appels'
        ? 'appel_id'
        : table === 'historique_meetings'
        ? 'meeting_id'
        : table === 'taches'
        ? 'tache_id'
        : table === 'historique_emails'
        ? 'email_id'
        : '';
    const { error } = await supabase.from(table).delete().eq(idField, id);
    if (error) alert(`Deletion error in ${table}: ${error.message}`);
    else refreshData();
  };
  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex space-x-4 mb-6">
        <button onClick={() => setActiveTab('smart_query')} 
        className={activeTab === 'smart_query' ? "bg-blue-600 text-white px-4 py-2 rounded-lg" : "bg-gray-300 text-gray-900 px-4 py-2 rounded-lg"}>
          Smart Query
        </button>

        <button
          onClick={() => setActiveTab('entreprises')}
          className={`px-4 py-2 rounded-lg focus:outline-none ${
            activeTab === 'entreprises' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-900'
          }`}
        >
          Entreprises
        </button>
        <button
          onClick={() => setActiveTab('prospects')}
          className={`px-4 py-2 rounded-lg focus:outline-none ${
            activeTab === 'prospects' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-900'
          }`}
        >
          Prospects
        </button>
        <button
          onClick={() => setActiveTab('historique_appels')}
          className={`px-4 py-2 rounded-lg focus:outline-none ${
            activeTab === 'historique_appels' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-900'
          }`}
        >
          Historique Appels
        </button>
 
        <button
          onClick={() => setActiveTab('emails')}
          className={`px-4 py-2 rounded-lg focus:outline-none ${
            activeTab === 'emails' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-900'
          }`}
        >
          Emails
        </button>


        <button
          onClick={() => setActiveTab('historique_meetings')}
          className={`px-4 py-2 rounded-lg focus:outline-none ${
            activeTab === 'historique_meetings' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-900'
          }`}
        >
          Historique Meetings
        </button>
        <button
          onClick={() => setActiveTab('taches')}
          className={`px-4 py-2 rounded-lg focus:outline-none ${
            activeTab === 'taches' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-900'
          }`}
        >
          Tâches
        </button>
      </div>




      {activeTab === 'smart_query' && (
        <div>
          <h1 className="text-3xl font-bold mb-6">Smart Query</h1>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Enter your natural language query"
              className="p-3 border border-gray-300 rounded-md w-full"
              value={smartQueryInput}
              onChange={(e) => setSmartQueryInput(e.target.value)}
            />
          </div>
          <button
            onClick={handleRunSmartQuery}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            disabled={loadingSmartQuery}
          >
            {loadingSmartQuery ? "Running Query..." : "Run Query"}
          </button>
          {smartQueryResult && (
            <div className="mt-6">
              <p><strong>Generated SQL:</strong> {smartQueryResult.sql}</p>
              <p>
                <strong>Validation:</strong> {smartQueryResult.validation[0] ? "SQL is valid" : `Error: ${smartQueryResult.validation[1]}`}
              </p>
              <p><strong>Query Results:</strong> {JSON.stringify(smartQueryResult.queryResults)}</p>
              {smartQueryResult.summary && (<p><strong>Summary:</strong> {smartQueryResult.summary}</p>)}
            </div>
          )}
        </div>
      )}







      {activeTab === 'entreprises' && (
        <div>
          <h1 className="text-3xl font-bold mb-6">Entreprise Management</h1>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmitGeneric('entreprises', formEntreprises, editingEntreprises, setEditingEntreprises, () =>
                fetchData('entreprises', setEntreprises)
              );
              setFormEntreprises({
                nom_entreprise: '',
                secteur_activite: '',
                taille_entreprise: '',
                adresse: '',
                site_web: '',
                strategie_entreprise: '',
                notes: '',
              });
            }}
            className="mb-8 p-6 bg-white rounded-lg shadow text-left w-full"
          >
            <div className="flex flex-col space-y-4 mb-6">
              <div className="w-full">
                <input
                  type="text"
                  placeholder="Nom de l'entreprise"
                  className="p-3 border border-gray-300 rounded-md w-full"
                  value={formEntreprises.nom_entreprise}
                  onChange={(e) => setFormEntreprises({ ...formEntreprises, nom_entreprise: e.target.value })}
                  required
                />
              </div>
              <div className="w-full">
                <input
                  type="text"
                  placeholder="Secteur d'activité"
                  className="p-3 border border-gray-300 rounded-md w-full"
                  value={formEntreprises.secteur_activite}
                  onChange={(e) => setFormEntreprises({ ...formEntreprises, secteur_activite: e.target.value })}
                  required
                />
              </div>
              <div className="w-full">
                <input
                  type="text"
                  placeholder="Taille d'entreprise (optional)"
                  className="p-3 border border-gray-300 rounded-md w-full"
                  value={formEntreprises.taille_entreprise}
                  onChange={(e) => setFormEntreprises({ ...formEntreprises, taille_entreprise: e.target.value })}
                />
              </div>
              <div className="w-full">
                <input
                  type="text"
                  placeholder="Adresse (optional)"
                  className="p-3 border border-gray-300 rounded-md w-full"
                  value={formEntreprises.adresse}
                  onChange={(e) => setFormEntreprises({ ...formEntreprises, adresse: e.target.value })}
                />
              </div>
              <div className="w-full">
                <input
                  type="text"
                  placeholder="Site Web (optional)"
                  className="p-3 border border-gray-300 rounded-md w-full"
                  value={formEntreprises.site_web}
                  onChange={(e) => setFormEntreprises({ ...formEntreprises, site_web: e.target.value })}
                />
              </div>
              <div className="w-full">
                <input
                  type="text"
                  placeholder="Stratégie d'entreprise (optional)"
                  className="p-3 border border-gray-300 rounded-md w-full"
                  value={formEntreprises.strategie_entreprise}
                  onChange={(e) => setFormEntreprises({ ...formEntreprises, strategie_entreprise: e.target.value })}
                />
              </div>
              <div className="w-full">
                <textarea
                  placeholder="Notes (optional)"
                  className="p-3 border border-gray-300 rounded-md w-full h-32"
                  value={formEntreprises.notes}
                  onChange={(e) => setFormEntreprises({ ...formEntreprises, notes: e.target.value })}
                />
              </div>
            </div>
            <div className="text-left">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                {editingEntreprises ? 'Update Entreprise' : 'Add Entreprise'}
              </button>
            </div>
          </form>

          <div className="grid gap-4">
            {entreprises.map((entreprise) => (
              <div
                key={entreprise.entreprise_id}
                className="p-4 border rounded-lg shadow flex justify-between items-center"
              >
                <div>
                  <h3 className="font-semibold text-lg">{entreprise.nom_entreprise}</h3>
                  <p className="text-gray-600">{entreprise.secteur_activite}</p>
                  <small className="text-xs text-gray-400">
                    {new Date(entreprise.date_creation).toLocaleDateString()}
                  </small>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setFormEntreprises({
                        nom_entreprise: entreprise.nom_entreprise,
                        secteur_activite: entreprise.secteur_activite,
                        taille_entreprise: entreprise.taille_entreprise || '',
                        adresse: entreprise.adresse || '',
                        site_web: entreprise.site_web || '',
                        strategie_entreprise: entreprise.strategie_entreprise || '',
                        notes: entreprise.notes || '',
                      });
                      setEditingEntreprises(entreprise.entreprise_id.toString());
                    }}
                    className="px-3 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() =>
                      handleDeleteGeneric('entreprises', entreprise.entreprise_id.toString(), () =>
                        fetchData('entreprises', setEntreprises)
                      )
                    }
                    className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'prospects' && (
        <div>
          <h1 className="text-3xl font-bold mb-6">Prospect Management</h1>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmitGeneric(
                'prospects',
                formProspects,
                editingProspects,
                setEditingProspects,
                () => fetchData('prospects', setProspects)
              );
              setFormProspects({
                nom: '',
                prenom: '',
                email: '',
                nom_entreprise: '',
                telephone: '',
                fonction: '',
                notes: '',
              });
            }}
            className="mb-8 p-6 bg-white rounded-lg shadow text-left w-full"
          >
            <div className="flex flex-col space-y-4 mb-6">
              <div className="w-full">
                <input
                  type="text"
                  placeholder="Nom"
                  className="p-3 border border-gray-300 rounded-md w-full"
                  value={formProspects.nom}
                  onChange={(e) => setFormProspects({ ...formProspects, nom: e.target.value })}
                  required
                />
              </div>
              <div className="w-full">
                <input
                  type="text"
                  placeholder="Prenom"
                  className="p-3 border border-gray-300 rounded-md w-full"
                  value={formProspects.prenom}
                  onChange={(e) => setFormProspects({ ...formProspects, prenom: e.target.value })}
                  required
                />
              </div>
              <div className="w-full">
                <input
                  type="email"
                  placeholder="Email"
                  className="p-3 border border-gray-300 rounded-md w-full"
                  value={formProspects.email}
                  onChange={(e) => setFormProspects({ ...formProspects, email: e.target.value })}
                  required
                />
              </div>
              <div className="w-full">
  <select
    className="p-3 border border-gray-300 rounded-md w-full"
    value={formProspects.nom_entreprise}
    onChange={(e) =>
      setFormProspects({ ...formProspects, nom_entreprise: e.target.value })
    }
  >
    <option value="">Select Entreprise</option>
    {entreprises.map((entreprise: Entreprise) => (
      <option key={entreprise.entreprise_id} value={entreprise.nom_entreprise}>
        {entreprise.nom_entreprise}
      </option>
    ))}
  </select>
              </div>
              <div className="w-full">
                <input
                  type="text"
                  placeholder="Telephone (optional)"
                  className="p-3 border border-gray-300 rounded-md w-full"
                  value={formProspects.telephone}
                  onChange={(e) => setFormProspects({ ...formProspects, telephone: e.target.value })}
                />
              </div>
              <div className="w-full">
                <input
                  type="text"
                  placeholder="Fonction (optional)"
                  className="p-3 border border-gray-300 rounded-md w-full"
                  value={formProspects.fonction}
                  onChange={(e) => setFormProspects({ ...formProspects, fonction: e.target.value })}
                />
              </div>
              <div className="w-full">
                <textarea
                  placeholder="Notes (optional)"
                  className="p-3 border border-gray-300 rounded-md w-full h-32"
                  value={formProspects.notes}
                  onChange={(e) => setFormProspects({ ...formProspects, notes: e.target.value })}
                />
              </div>
            </div>
            <div className="text-left">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                {editingProspects ? 'Update Prospect' : 'Add Prospect'}
              </button>
            </div>
          </form>

          <div className="grid gap-4">
            {prospects.map((prospect) => (
              <div
                key={prospect.prospect_id}
                className="p-4 border rounded-lg shadow flex justify-between items-center"
              >
                <div>
                  <h3 className="font-semibold text-lg">
                    {prospect.nom} {prospect.prenom}
                  </h3>
                  <p className="text-gray-600">{prospect.email}</p>
                  <small className="text-xs text-gray-400">
                    {prospect.date_creation ? new Date(prospect.date_creation).toLocaleDateString() : ''}
                  </small>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      if (prospect.entreprise_id) {
                        const { data: entrepriseData, error } = await supabase
                          .from('entreprises')
                          .select('nom_entreprise')
                          .eq('entreprise_id', prospect.entreprise_id)
                          .single();
                        if (error || !entrepriseData) {
                          alert("Unable to fetch company name. Please check the entreprise_id.");
                          setFormProspects({
                            nom: prospect.nom,
                            prenom: prospect.prenom,
                            email: prospect.email,
                            nom_entreprise: '',
                            telephone: prospect.telephone || '',
                            fonction: prospect.fonction || '',
                            notes: prospect.notes || '',
                          });
                        } else {
                          setFormProspects({
                            nom: prospect.nom,
                            prenom: prospect.prenom,
                            email: prospect.email,
                            nom_entreprise: entrepriseData.nom_entreprise,
                            telephone: prospect.telephone || '',
                            fonction: prospect.fonction || '',
                            notes: prospect.notes || '',
                          });
                        }
                      } else {
                        setFormProspects({
                          nom: prospect.nom,
                          prenom: prospect.prenom,
                          email: prospect.email,
                          nom_entreprise: '',
                          telephone: prospect.telephone || '',
                          fonction: prospect.fonction || '',
                          notes: prospect.notes || '',
                        });
                      }
                      setEditingProspects(prospect.prospect_id.toString());
                    }}
                    className="px-3 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() =>
                      handleDeleteGeneric('prospects', prospect.prospect_id.toString(), () =>
                        fetchData('prospects', setProspects)
                      )
                    }
                    className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'historique_appels' && (
        <div>
          <h1 className="text-3xl font-bold mb-6">Historique Appels</h1>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmitGeneric('historique_appels', formHistoriqueAppels, editingHistoriqueAppels, setEditingHistoriqueAppels, () =>
                fetchData('historique_appels', setHistoriqueAppels)
              );
              setFormHistoriqueAppels({
                nom_prospect: '',
                date_appel: '',
                notes: '',
              });
            }}
            className="mb-8 p-6 bg-white rounded-lg shadow"
          >
            <div className="flex flex-col gap-4 mb-6">
              <select
                className="p-3 border border-gray-300 rounded-md"
                value={formHistoriqueAppels.nom_prospect}
                onChange={(e) => setFormHistoriqueAppels({ ...formHistoriqueAppels, nom_prospect: e.target.value })}
                required
              >
                <option value="">Select Prospect</option>
                {prospects.map((p) => (
                  <option key={p.prospect_id} value={p.nom}>
                    {p.nom} {p.prenom}
                  </option>
                ))}
              </select>
              <input
                type="datetime-local"
                placeholder="Date Appel"
                className="p-3 border border-gray-300 rounded-md"
                value={formHistoriqueAppels.date_appel}
                onChange={(e) => setFormHistoriqueAppels({ ...formHistoriqueAppels, date_appel: e.target.value })}
                required
              />
              <textarea
                placeholder="Notes (optional)"
                className="p-3 border border-gray-300 rounded-md h-32"
                value={formHistoriqueAppels.notes}
                onChange={(e) => setFormHistoriqueAppels({ ...formHistoriqueAppels, notes: e.target.value })}
              />
            </div>
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              {editingHistoriqueAppels ? 'Update Historique Appel' : 'Add Historique Appel'}
            </button>
          </form>

          <div className="grid gap-4">
            {historiqueAppels.map((appel) => (
              <div
                key={appel.appel_id}
                className="p-4 border rounded-lg shadow flex justify-between items-center"
              >
                <div>
                  <div className="font-semibold text-lg">
                    Call with {appel.prospect_nom || `prospect ID: ${appel.prospect_id}`}
                  </div>
                  <p className="text-gray-600">{appel.date_appel ? new Date(appel.date_appel).toLocaleString() : ''}</p>
                  <p className="text-gray-600">{appel.notes}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      const { data: prospectData } = await supabase
                        .from('prospects')
                        .select('nom')
                        .eq('prospect_id', appel.prospect_id)
                        .single();
                      setFormHistoriqueAppels({
                        nom_prospect: prospectData?.nom || '',
                        date_appel: appel.date_appel,
                        notes: appel.notes || '',
                      });
                      setEditingHistoriqueAppels(appel.appel_id.toString());
                    }}
                    className="px-3 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() =>
                      handleDeleteGeneric('historique_appels', appel.appel_id.toString(), () =>
                        fetchData('historique_appels', setHistoriqueAppels)
                      )
                    }
                    className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'historique_meetings' && (
        <div>
          <h1 className="text-3xl font-bold mb-6">Historique Meetings</h1>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmitGeneric('historique_meetings', formHistoriqueMeetings, editingHistoriqueMeetings, setEditingHistoriqueMeetings, () =>
                fetchData('historique_meetings', setHistoriqueMeetings)
              );
              setFormHistoriqueMeetings({
                nom_prospect: '',
                date_meeting: '',
                participants: '',
                notes: '',
              });
            }}
            className="mb-8 p-6 bg-white rounded-lg shadow"
          >
            <div className="flex flex-col gap-4 mb-6">
              <select
                className="p-3 border border-gray-300 rounded-md"
                value={formHistoriqueMeetings.nom_prospect}
                onChange={(e) => setFormHistoriqueMeetings({ ...formHistoriqueMeetings, nom_prospect: e.target.value })}
                required
              >
                <option value="">Select Prospect</option>
                {prospects.map((p) => (
                  <option key={p.prospect_id} value={p.nom}>
                    {p.nom} {p.prenom}
                  </option>
                ))}
              </select>
              <input
                type="datetime-local"
                placeholder="Date Meeting"
                className="p-3 border border-gray-300 rounded-md"
                value={formHistoriqueMeetings.date_meeting}
                onChange={(e) =>
                  setFormHistoriqueMeetings({ ...formHistoriqueMeetings, date_meeting: e.target.value })
                }
                required
              />
              <input
                type="text"
                placeholder="Participants"
                className="p-3 border border-gray-300 rounded-md"
                value={formHistoriqueMeetings.participants}
                onChange={(e) =>
                  setFormHistoriqueMeetings({ ...formHistoriqueMeetings, participants: e.target.value })
                }
                required
              />
              <textarea
                placeholder="Notes (optional)"
                className="p-3 border border-gray-300 rounded-md h-32"
                value={formHistoriqueMeetings.notes}
                onChange={(e) => setFormHistoriqueMeetings({ ...formHistoriqueMeetings, notes: e.target.value })}
              />
            </div>
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              {editingHistoriqueMeetings ? 'Update Historique Meeting' : 'Add Historique Meeting'}
            </button>
          </form>

          <div className="grid gap-4">
            {historiqueMeetings.map((meeting) => (
              <div
                key={meeting.meeting_id}
                className="p-4 border rounded-lg shadow flex justify-between items-center"
              >
                <div>
                  <div className="font-semibold text-lg">
                    Meeting with {meeting.prospect_nom || `prospect ID: ${meeting.prospect_id}`}
                  </div>
                  <p className="text-gray-600">
                    {meeting.date_meeting ? new Date(meeting.date_meeting).toLocaleString() : ''}
                  </p>
                  <p className="text-gray-600">Participants: {meeting.participants}</p>
                  <p className="text-gray-600">{meeting.notes}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      const { data: prospectData } = await supabase
                        .from('prospects')
                        .select('nom')
                        .eq('prospect_id', meeting.prospect_id)
                        .single();
                      setFormHistoriqueMeetings({
                        nom_prospect: prospectData?.nom || '',
                        date_meeting: meeting.date_meeting,
                        participants: meeting.participants,
                        notes: meeting.notes || '',
                      });
                      setEditingHistoriqueMeetings(meeting.meeting_id.toString());
                    }}
                    className="px-3 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() =>
                      handleDeleteGeneric('historique_meetings', meeting.meeting_id.toString(), () =>
                        fetchData('historique_meetings', setHistoriqueMeetings)
                      )
                    }
                    className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}


{activeTab === 'emails' && (
  <div>
    <h1 className="text-3xl font-bold mb-6">Historique Emails</h1>
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmitGeneric(
          'historique_emails',
          formEmails,
          editingEmails,
          setEditingEmails,
          () => fetchData('historique_emails', setEmails)
        );
        setFormEmails({
          nom_prospect: '',
          date_email: '',
          expediteur: '',
          destinataire: '',
          sujet: '',
          corps: '',
        });
      }}
      className="mb-8 p-6 bg-white rounded-lg shadow text-left"
    >
      <div className="flex flex-col gap-4 mb-6">
        <select
          className="p-3 border border-gray-300 rounded-md"
          value={formEmails.nom_prospect}
          onChange={(e) =>
            setFormEmails({ ...formEmails, nom_prospect: e.target.value })
          }
          required
        >
          <option value="">Select Prospect</option>
          {prospects.map((p) => (
            <option key={p.prospect_id} value={p.nom}>
              {p.nom} {p.prenom}
            </option>
          ))}
        </select>
        <input
          type="datetime-local"
          placeholder="Date Email"
          className="p-3 border border-gray-300 rounded-md"
          value={formEmails.date_email}
          onChange={(e) =>
            setFormEmails({ ...formEmails, date_email: e.target.value })
          }
          required
        />
        <input
          type="text"
          placeholder="Expéditeur"
          className="p-3 border border-gray-300 rounded-md"
          value={formEmails.expediteur}
          onChange={(e) =>
            setFormEmails({ ...formEmails, expediteur: e.target.value })
          }
        />
        <input
          type="text"
          placeholder="Destinataire"
          className="p-3 border border-gray-300 rounded-md"
          value={formEmails.destinataire}
          onChange={(e) =>
            setFormEmails({ ...formEmails, destinataire: e.target.value })
          }
        />
        <input
          type="text"
          placeholder="Sujet"
          className="p-3 border border-gray-300 rounded-md"
          value={formEmails.sujet}
          onChange={(e) =>
            setFormEmails({ ...formEmails, sujet: e.target.value })
          }
        />
        <textarea
          placeholder="Corps"
          className="p-3 border border-gray-300 rounded-md h-32"
          value={formEmails.corps}
          onChange={(e) =>
            setFormEmails({ ...formEmails, corps: e.target.value })
          }
        />
      </div>
      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
      >
        {editingEmails ? 'Update Email' : 'Add Email'}
      </button>
    </form>

    <div className="grid gap-4">
      {emails.map((email) => (
        <div
          key={email.email_id}
          className="p-4 border rounded-lg shadow flex justify-between items-center"
        >
          <div>
            <div className="font-semibold text-lg">
              {email.sujet || '(No subject)'} —{' '}
              {email.prospect_nom ||
                `prospect ID: ${email.prospect_id}`}
            </div>
            <p className="text-gray-600">
              {email.date_email
                ? new Date(email.date_email).toLocaleString()
                : ''}
            </p>
            <p className="text-gray-600">From: {email.expediteur}</p>
            <p className="text-gray-600">To: {email.destinataire}</p>
            <p className="text-gray-600">{email.corps}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                const { data: prospectData } = await supabase
                  .from('prospects')
                  .select('nom')
                  .eq('prospect_id', email.prospect_id)
                  .single();
                  setFormEmails({
                    nom_prospect: prospectData?.nom || '',
                    date_email: email.date_email ?? '',
                    expediteur: email.expediteur || '',
                    destinataire: email.destinataire || '',
                    sujet: email.sujet || '',
                    corps: email.corps || '',
                  });
                setEditingEmails(email.email_id.toString());
              }}
              className="px-3 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
            >
              Edit
            </button>
            <button
              onClick={() =>
                handleDeleteGeneric(
                  'historique_emails',
                  email.email_id.toString(),
                  () => fetchData('historique_emails', setEmails)
                )
              }
              className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  </div>
)}





      {activeTab === 'taches' && (
        <div>
          <h1 className="text-3xl font-bold mb-6">Tâches</h1>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmitGeneric(
                'taches',
                formTaches,
                editingTaches,
                setEditingTaches,
                () => fetchData('taches', setTaches)
              );
              setFormTaches({
                prospect_id: '',
                libelle: '',
                status: '',
                date_objectif: '',
                notes: '',
              });
            }}
            className="mb-8 p-6 bg-white rounded-lg shadow w-full"
          >
            <div className="flex flex-col space-y-4 mb-6 w-full">
              <div className="w-full">
                <select
                  className="p-3 border border-gray-300 rounded-md w-full"
                  value={formTaches.prospect_id}
                  onChange={(e) =>
                    setFormTaches({ ...formTaches, prospect_id: e.target.value })
                  }
                  required
                >
                  <option value="">Select Prospect</option>
                  {prospects.map((p) => (
                    <option key={p.prospect_id} value={p.prospect_id}>
                      {p.nom} {p.prenom}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-full">
                <input
                  type="text"
                  placeholder="Libellé"
                  className="p-3 border border-gray-300 rounded-md w-full"
                  value={formTaches.libelle}
                  onChange={(e) =>
                    setFormTaches({ ...formTaches, libelle: e.target.value })
                  }
                  required
                />
              </div>
              <div className="w-full">
                <input
                  type="text"
                  placeholder="Status"
                  className="p-3 border border-gray-300 rounded-md w-full"
                  value={formTaches.status}
                  onChange={(e) =>
                    setFormTaches({ ...formTaches, status: e.target.value })
                  }
                />
              </div>
              <div className="w-full">
                <input
                  type="datetime-local"
                  placeholder="Date Objectif"
                  className="p-3 border border-gray-300 rounded-md w-full"
                  value={formTaches.date_objectif}
                  onChange={(e) =>
                    setFormTaches({ ...formTaches, date_objectif: e.target.value })
                  }
                />
              </div>
              <div className="w-full">
                <textarea
                  placeholder="Notes (optional)"
                  className="p-3 border border-gray-300 rounded-md w-full h-32"
                  value={formTaches.notes}
                  onChange={(e) =>
                    setFormTaches({ ...formTaches, notes: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="text-left">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                {editingTaches ? 'Update Tâche' : 'Add Tâche'}
              </button>
            </div>
          </form>

          <div className="grid gap-4">
            {taches.map((tache) => (
              <div
                key={tache.tache_id}
                className="p-4 border rounded-lg shadow flex justify-between items-center"
              >
                <div>
                  <div className="font-semibold text-lg">Libellé: {tache.libelle}</div>
                  <p className="text-gray-600">Status: {tache.status}</p>
                  <p className="text-gray-600">
                    Date Objectif:{' '}
                    {tache.date_objectif ? new Date(tache.date_objectif).toLocaleString() : ''}
                  </p>
                  <p className="text-gray-600">Notes: {tache.notes}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setFormTaches({
                        prospect_id: tache.prospect_id ? tache.prospect_id.toString() : '',
                        libelle: tache.libelle || '',
                        status: tache.status || '',
                        date_objectif: tache.date_objectif || '',
                        notes: tache.notes || '',
                      });
                      setEditingTaches(tache.tache_id.toString());
                    }}
                    className="px-3 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() =>
                      handleDeleteGeneric('taches', tache.tache_id.toString(), () =>
                        fetchData('taches', setTaches)
                      )
                    }
                    className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
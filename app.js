const FP_CONFIG = {
  clientId: 'live-aktiv-finansportalen',
  clientSecret: ''
};

const { createClient } = supabase;
  const db = createClient(
    'https://infvmrapalancgwhuvhh.supabase.co',
    'sb_publishable_aCpIUWseYZBrXZZdkvsGkQ_3nuGk4ws'
  );

  // ── VIEWS ──────────────────────────────────────────────────
  function showView(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  }
  function showLogin()    { document.getElementById('loginForm').style.display='block'; document.getElementById('registerForm').style.display='none'; document.getElementById('confirmForm').style.display='none'; }
  function showRegister() { document.getElementById('loginForm').style.display='none'; document.getElementById('registerForm').style.display='block'; document.getElementById('confirmForm').style.display='none'; }
  function showConfirm(email) {
    document.getElementById('loginForm').style.display='none';
    document.getElementById('registerForm').style.display='none';
    document.getElementById('confirmForm').style.display='block';
    document.getElementById('confirmEmailDisplay').textContent = email;
  }

  function showMsg(id, text, type) {
    const el = document.getElementById(id);
    el.textContent = text; el.className = 'auth-msg ' + type;
    el.style.display = 'block';
  }

  // ── PROFIL ────────────────────────────────────────────────
  async function saveProfil() {
    const { data: { session } } = await db.auth.getSession();
    if (!session) return;

    const fornavn   = document.getElementById('profFornavn').value.trim();
    const etternavn = document.getElementById('profEtternavn').value.trim();
    const fodsel    = document.getElementById('profFodsel').value;
    const adresse   = document.getElementById('profAdresse').value.trim();
    const postnr    = document.getElementById('profPostnr').value.trim();
    const poststed  = document.getElementById('profPoststed').value.trim();

    const fodselsnr = document.getElementById('profFodselsnr').value.trim();
    const telefon   = document.getElementById('profTelefon').value.trim();
    if (!fornavn || !etternavn || !fodselsnr || !adresse || !postnr || !poststed) {
      alert('Fyll ut: fornavn, etternavn, fødselsnummer, adresse, postnummer og poststed.'); return;
    }
    if (fodselsnr.length !== 11) {
      alert('Fødselsnummer må være 11 siffer.'); return;
    }

    const { error } = await db.from('profiler').upsert({
      user_id: session.user.id, fornavn, etternavn,
        fodselsnummer: document.getElementById('profFodselsnr').value.trim(),
        telefon: document.getElementById('profTelefon').value.trim(),
        epost: document.getElementById('profEpost').value.trim(),
        lonn_aar: parseInt(document.getElementById('profLonnAar').value) || null,
        lonn_mnd: parseInt(document.getElementById('profLonnMnd').value) || null,
        bolig: document.getElementById('profBolig').value || null,
        husleie: parseInt(document.getElementById('profHusleie')?.value) || null,
        laan: JSON.stringify(laanerListe),
      fodselsdato: fodsel, adresse, postnummer: postnr, poststed
    }, { onConflict: 'user_id' });

    if (error) { alert('Noe gikk galt: ' + error.message); return; }

    document.getElementById('profilSaveMsg').style.display = 'block';
    visProfilData({
      fornavn, etternavn, fodselsdato: fodsel, adresse, postnummer: postnr, poststed,
      fodselsnummer: document.getElementById('profFodselsnr').value.trim(),
      telefon: document.getElementById('profTelefon').value.trim(),
      epost: document.getElementById('profEpost').value.trim(),
      lonn_aar: document.getElementById('profLonnAar').value,
      lonn_mnd: document.getElementById('profLonnMnd').value,
    });

    // Vis resten av siden nå som profil er lagret
    const seksjoner = document.querySelectorAll('.form-section');
    seksjoner.forEach(s => s.style.display = 'block');
    document.querySelector('.cards').style.display = 'grid';
    document.getElementById('statusText').innerHTML =
      '<strong>Fullfør oppsettet ditt</strong> — legg inn strømavtalen din nedenfor for å aktivere overvåking.';
    loadStromData(session.user.id);
  }

  function visProfilData(p) {
    document.getElementById('visNavn').textContent       = (p.fornavn || '') + ' ' + (p.etternavn || '');
    document.getElementById('visFodselsnr').textContent  = p.fodselsnummer ? '••••••' + p.fodselsnummer.slice(-5) : '—';
    document.getElementById('visTelefon').textContent    = p.telefon || '—';
    document.getElementById('visEpost').textContent      = p.epost || '—';
    document.getElementById('visAdresse').textContent    = p.adresse || '—';
    document.getElementById('visPost').textContent       = ((p.postnummer || '') + ' ' + (p.poststed || '')).trim() || '—';
    if (p.lonn_aar) {
      document.getElementById('visLonn').textContent = parseInt(p.lonn_aar).toLocaleString('no-NO') + ' kr/år';
      document.getElementById('visMndLonn').textContent = parseInt(p.lonn_mnd || 0).toLocaleString('no-NO') + ' kr/mnd';
    }
    document.getElementById('profilVisning').style.display = 'block';
    document.getElementById('profilSkjema').style.display  = 'none';
    document.getElementById('profilRedigerBtn').style.display = 'block';
    // Oppdater velkomst med navn og strømpris
    if (p.fornavn) {
      document.getElementById('velkomstNavn').textContent = p.fornavn;
      document.getElementById('velkomstSub').textContent =
        'Her holder du oversikt over avtalene dine og gir oss tillatelse til å bytte for deg.';
      const pill = document.getElementById('dagensPrisPill');
      pill.style.display = 'flex';
      hentDagensStrompris(poststedTilOmraade(p.poststed || ''));
    }
    // Vis adresseforslag på alle målere
    if (p.adresse) {
      profilAdresseGlobal = (p.adresse + ', ' + (p.postnummer||'') + ' ' + (p.poststed||'')).trim();
      document.querySelectorAll('.adresse-forslag').forEach(el => {
        el.querySelector('strong').textContent = profilAdresseGlobal;
        el.style.display = 'block';
      });
    }
  }

  function poststedTilOmraade(poststed) {
    const ps = poststed.toLowerCase();
    if (/oslo|akershus|østfold|viken|innlandet|hedmark|oppland/.test(ps)) return 'NO1';
    if (/agder|rogaland|stavanger|kristiansand/.test(ps)) return 'NO2';
    if (/trondheim|trøndelag|møre|romsdal/.test(ps)) return 'NO3';
    if (/nordland|troms|finnmark|tromsø|bodø/.test(ps)) return 'NO4';
    if (/bergen|vestland|hordaland|sogndal/.test(ps)) return 'NO5';
    return 'NO1'; // default
  }

  function toggleProfilRediger() {
    const skjema = document.getElementById('profilSkjema');
    const visning = document.getElementById('profilVisning');
    const btn = document.getElementById('profilRedigerBtn');
    if (skjema.style.display === 'none') {
      skjema.style.display = 'block';
      visning.style.display = 'none';
      btn.textContent = '✕ Avbryt';
    } else {
      skjema.style.display = 'none';
      visning.style.display = 'block';
      btn.textContent = '✏️ Rediger';
    }
  }

  async function slaSoekPoststed(input) {
    const postnr = input.value.trim();
    if (postnr.length === 4) {
      try {
        const res = await fetch('https://api.bring.com/shippingguide/api/postalCode.json?clientUrl=byttehjelpern&pnr=' + postnr);
        const data = await res.json();
        if (data.result) document.getElementById('profPoststed').value = data.result;
      } catch(e) {}
    }
  }

  async function loadProfilData(userId) {
    const { data } = await db.from('profiler').select('*').eq('user_id', userId).single();
    if (!data) return;
    document.getElementById('profFornavn').value    = data.fornavn || '';
    document.getElementById('profEtternavn').value  = data.etternavn || '';
    document.getElementById('profFodsel').value     = data.fodselsdato || '';
    document.getElementById('profFodselsnr').value  = data.fodselsnummer || '';
    document.getElementById('profTelefon').value    = data.telefon || '';
    document.getElementById('profEpost').value      = data.epost || '';
    document.getElementById('profAdresse').value    = data.adresse || '';
    document.getElementById('profPostnr').value     = data.postnummer || '';
    document.getElementById('profPoststed').value   = data.poststed || '';
    if (data.lonn_aar) document.getElementById('profLonnAar').value = data.lonn_aar;
    if (data.lonn_mnd) document.getElementById('profLonnMnd').value = data.lonn_mnd;
    if (data.bolig) {
      document.getElementById('profBolig').value = data.bolig;
      document.getElementById('husleieGruppe').style.display = data.bolig === 'leier' ? 'block' : 'none';
      document.getElementById('laanSeksjon').style.display = data.bolig === 'eier' ? 'block' : 'none';
      if (data.husleie) document.getElementById('profHusleie').value = data.husleie;
    }
    if (data.laan) { try { laanerListe = JSON.parse(data.laan); renderLaan(); } catch(e){} }
    visProfilData(data);
    oppdaterOkonomiSammendrag();
  }

  // ── INNLOGGING ─────────────────────────────────────────────
  async function handleLogin() {
    const email    = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const btn      = document.getElementById('loginBtn');
    if (!email || !password) { showMsg('loginMsg', 'Fyll inn e-post og passord.', 'error'); return; }

    btn.disabled = true; btn.textContent = 'Logger inn...';
    const { error } = await db.auth.signInWithPassword({ email, password });
    btn.disabled = false; btn.textContent = 'Logg inn';

    if (error) { showMsg('loginMsg', 'Feil e-post eller passord. Prøv igjen.', 'error'); return; }
    // onAuthStateChange tar over
  }

  // ── REGISTRERING ───────────────────────────────────────────
  async function handleRegister() {
    const email    = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const btn      = document.getElementById('registerBtn');
    if (!email || !password) { showMsg('registerMsg', 'Fyll inn e-post og passord.', 'error'); return; }
    if (password.length < 6) { showMsg('registerMsg', 'Passordet må være minst 6 tegn.', 'error'); return; }

    btn.disabled = true; btn.textContent = 'Oppretter konto...';
    const { error } = await db.auth.signUp({
      email, password,
      options: { emailRedirectTo: 'https://grand-mooncake-0a9c5b.netlify.app/minside.html' }
    });
    btn.disabled = false; btn.textContent = 'Opprett konto';

    if (error) { showMsg('registerMsg', error.message, 'error'); return; }
    showConfirm(email);
  }

  // ── LOGG UT ────────────────────────────────────────────────
  async function handleLogout() {
    await db.auth.signOut();
    showView('viewAuth'); showLogin();
    document.getElementById('navEmail').textContent = '';
    document.getElementById('logoutBtn').style.display = 'none';
  }

  // ── AUTH STATE ─────────────────────────────────────────────
  db.auth.onAuthStateChange((event, session) => {
    if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
      document.getElementById('navEmail').textContent = session.user.email;
      document.getElementById('logoutBtn').style.display = 'block';
      // Sjekk Pro-status
      const plan = session.user.user_metadata?.plan || '';
      if (plan === 'pro_trial' || plan === 'pro') {
        document.getElementById('navProBadge').classList.add('vis');
        const banner = document.getElementById('proWelcomeBanner');
        if (banner) banner.style.display = 'flex';
      }
      if (!window._dataLastet) {
        window._dataLastet = true;
        sjekkOgLastData(session.user.id);
        sjekkOgVisOnboarding(session.user.id);
      }
    }
    if (event === 'SIGNED_OUT') {
      window._dataLastet = false;
    }
  });
async function sjekkOgVisOnboarding(userId) {
  const fullfort = localStorage.getItem('ob_fullfort');
  if (fullfort) return;
  const { data } = await db.from('profiler').select('user_id').eq('user_id', userId).single();
  if (!data) {
    document.getElementById('onboardingOverlay').style.display = 'flex';
  }
}
  async function sjekkOgLastData(userId) {
    // Sjekk om profil er fylt ut
    const { data: profil } = await db.from('profiler').select('user_id').eq('user_id', userId).single();
    if (!profil) {
      // Ny bruker — vis kun profilskjema, skjul alt annet
      showView('viewDash');
      document.getElementById('profilSeksjon').scrollIntoView({ behavior: 'smooth' });
      // Skjul strømseksjonen til profil er lagret
      document.querySelector('.form-section:last-of-type') && 
        document.querySelectorAll('.form-section')[1] &&
        (document.querySelectorAll('.form-section')[1].style.display = 'none');
      document.getElementById('statusText').innerHTML =
        '<strong>Velkommen! 👋</strong> — Fyll ut profilen din for å komme i gang.';
      document.querySelector('.cards').style.display = 'none';
      return;
    }
    // Profil finnes — last alt normalt
    showView('viewDash');
    loadProfilData(userId);
    loadStromData(userId);
    loadMobilData(userId);
    loadForsikringData(userId);
    loadBredbandData(userId);
    loadAbonnementData(userId);
    renderKatalog();
  }

  // ── MULTI-MÅLER FUNKSJONAR ────────────────────────────────
  function leggTilMaaler(data = {}) {
    const template = document.getElementById('maalerTemplate');
    const klon = template.content.cloneNode(true);
    const kort = klon.querySelector('.maaler-kort');

    if (data.navn)       kort.querySelector('.maaler-navn').value         = data.navn;
    if (data.leverandor) kort.querySelector('.maaler-leverandor').value   = data.leverandor;
    if (data.avtaletype) kort.querySelector('.maaler-avtaletype').value   = data.avtaletype;
    if (data.forbruk)    kort.querySelector('.maaler-forbruk').value      = data.forbruk;
    if (data.nettleie)   kort.querySelector('.maaler-nettleie').value     = data.nettleie;
    if (data.malernr)    kort.querySelector('.maaler-malernr').value      = data.malernr;
    if (data.adresse)    kort.querySelector('.maaler-adresse').value      = data.adresse;

    const navnVis = kort.querySelector('.maaler-navn-vis');
    navnVis.textContent = data.navn || 'Ny måler';

    document.getElementById('maalerListe').appendChild(klon);
  }

  function oppdaterNavn(input) {
    const kort = input.closest('.maaler-kort');
    const navnVis = kort.querySelector('.maaler-navn-vis');
    navnVis.textContent = input.value || 'Ny måler';
  }

  function fjernMaaler(btn) {
    btn.closest('.maaler-kort').remove();
  }

  // ── LAGRE ALLE MÅLERE ─────────────────────────────────────
  async function saveStrom() {
    const { data: { session } } = await db.auth.getSession();
    if (!session) return;

    const korter = document.querySelectorAll('.maaler-kort');
    if (korter.length === 0) { alert('Legg til minst én måler før du lagrer.'); return; }

    const maalere = [];
    let ugyldig = false;
    korter.forEach(kort => {
      const lev = kort.querySelector('.maaler-leverandor').value;
      const type = kort.querySelector('.maaler-avtaletype').value;
      if (!lev || !type) { ugyldig = true; return; }
      maalere.push({
        navn:       kort.querySelector('.maaler-navn').value || 'Hjemme',
        leverandor: lev,
        avtaletype: type,
        forbruk:    parseInt(kort.querySelector('.maaler-forbruk').value) || null,
        nettleie:   parseFloat(kort.querySelector('.maaler-nettleie').value) || null,
        malernr:    kort.querySelector('.maaler-malernr').value.trim() || null,
        adresse:    kort.querySelector('.maaler-adresse').value.trim() || null,
      });
    });

    if (ugyldig) { alert('Velg leverandør og avtaletype på alle målere.'); return; }

    const payload = {
      user_id:  session.user.id,
      maalere:  JSON.stringify(maalere),
      samtykke: document.getElementById('stromSamtykke').checked,
    };

    const { error } = await db.from('strom_avtaler')
      .upsert({ ...payload }, { onConflict: 'user_id' });

    if (error) { alert('Noe gikk galt: ' + error.message); return; }

    document.getElementById('stromSaveMsg').style.display = 'block';
    const omr = poststedTilOmraade(document.getElementById('profPoststed')?.value || '');
    visStromAvtaleKort(maalere, omr);
    document.getElementById('stromStatus').textContent = '✓ ' + maalere.length + ' måler(e)';
    document.getElementById('stromStatus').classList.add('filled');
    if (payload.samtykke) {
      document.getElementById('statusDot').classList.add('active');
      document.getElementById('statusText').innerHTML =
        '<strong>Aktiv overvåking</strong> — vi varsler deg når vi finner en bedre strømavtale.';
    }
  }

  // ── LAST EKSISTERENDE DATA ─────────────────────────────────
  async function loadStromData(userId) {
    window._stromLeverandor = null;
    const { data } = await db.from('strom_avtaler').select('*').eq('user_id', userId).single();
    if (!data) {
      leggTilMaaler(); // Start med én tom måler
      return;
    }
    if (data.samtykke) document.getElementById('stromSamtykke').checked = true;

    let maalere = [];
    try { maalere = JSON.parse(data.maalere || '[]'); } catch(e) {}

    if (maalere.length > 0) {
      maalere.forEach(m => leggTilMaaler(m));
    } else if (data.leverandor) {
      // Gammelt format – konverter til ny struktur
      leggTilMaaler({
        navn:       'Hjemme',
        leverandor: data.leverandor,
        avtaletype: data.avtaletype,
        forbruk:    data.forbruk_kwh,
        nettleie:   data.nettleie,
        malernr:    data.malernummer,
      });
    } else {
      leggTilMaaler();
    }

    const antall = maalere.length || 1;
    const lev = maalere[0]?.leverandor || 'Ukjent';
    oppdaterStatusKort('Strom', null,
      lev + (antall > 1 ? ` + ${antall-1} til` : ''),
      'Overvåkes aktivt', data.samtykke ? 'green' : 'yellow');
    // Vis avtale-kort med alternativer
    const omraade = poststedTilOmraade(document.getElementById('profPoststed')?.value || '');
    visStromAvtaleKort(maalere, omraade);
    if (data.samtykke) {
      document.getElementById('statusDot').classList.add('active');
      document.getElementById('statusText').innerHTML =
        '<strong>Aktiv overvåking</strong> — vi varsler deg når vi finner en bedre strømavtale.';
    }
  }

  // ── SIDEBAR NAVIGASJON ────────────────────────────────────────────────


  // ── VELKOMST OG STRØMPRIS ────────────────────────────────────────────
  let profilAdresseGlobal = '';
  let profilPoststedGlobal = '';


  async function hentDagensStrompris(omraade) {
    try {
      const now = new Date();
      const url = `https://www.hvakosterstrommen.no/api/v1/prices/${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}_${omraade}.json`;
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const naaTime = now.getHours();
      const naaPris = data[naaTime] ? (data[naaTime].NOK_per_kWh * 100).toFixed(1) : null;
      const snitt = (data.reduce((a,b) => a + b.NOK_per_kWh, 0) / data.length * 100).toFixed(1);
      document.getElementById('dagensPrisTekst').textContent =
        naaPris
          ? `Strøm nå (${omraade}): ${naaPris} øre/kWh · Snitt i dag: ${snitt} øre/kWh`
          : `Strøm snitt i dag (${omraade}): ${snitt} øre/kWh`;
    } catch(e) {
      document.getElementById('dagensPrisTekst').textContent = 'Strømpris ikke tilgjengelig nå';
    }
  }

  // ── STATUS-INDIKATORER ───────────────────────────────────────────────
  function oppdaterStatusKort(id, indikator, info, tid, farge) {
    const el = document.getElementById('sind' + id);
    if (el) { el.className = 'status-indikator ' + farge; }
    const sdot = document.getElementById('sdot' + id);
    if (sdot) { sdot.className = 'sidebar-dot ' + farge; }
    if (info) document.getElementById('sinfo' + id).textContent = info;
    if (tid) {
      const tidEl = document.getElementById('stid' + id);
      tidEl.textContent = tid;
      tidEl.className = 'status-kort-tid' + (farge === 'red' ? ' aldri' : '');
    }
  }

  // ── ADRESSE-FORSLAG ──────────────────────────────────────────────────
  function visAdresseForslag(adresse, postnr, poststed) {
    profilAdresseGlobal = `${adresse}, ${postnr} ${poststed}`;
    const forslagEls = document.querySelectorAll('.adresse-forslag');
    forslagEls.forEach(el => {
      el.querySelector('strong').textContent = profilAdresseGlobal;
      el.style.display = 'block';
    });
  }

  function brukProfilAdresse(el) {
    const input = el.previousElementSibling;
    if (input && profilAdresseGlobal) input.value = profilAdresseGlobal;
  }

  // ── LAGRE MOBIL ──────────────────────────────────────────────────────
  async function saveMobil() {
    const { data: { session } } = await db.auth.getSession();
    if (!session) return;
    const operatr = document.getElementById('mobilOperator').value;
    if (!operatr) { alert('Velg operatør.'); return; }
    const payload = {
      operator: operatr,
      data_gb: document.getElementById('mobilData').value,
      pris: parseInt(document.getElementById('mobilPris').value)||null,
      antall: parseInt(document.getElementById('mobilAntall').value)||1,
      sist_sjekket: new Date().toISOString().split('T')[0],
    };
    window._mobilData = payload;
    const { error: mobilErr } = await db.from('mobil_avtaler').upsert({ user_id: session.user.id, ...payload }, { onConflict: 'user_id' });
    if (mobilErr) { alert('Lagring feilet: ' + mobilErr.message); return; }
    document.getElementById('mobilSaveMsg').style.display = 'block';
    oppdaterStatusKort('Mobil', null, operatr + ' · ' + (payload.data_gb||'?'), 'Sjekket i dag', 'green');
    document.getElementById('sdotMobil').className = 'sidebar-dot green';
    visMobilAvtaleKort(payload);
    setTimeout(() => document.getElementById('mobilSaveMsg').style.display = 'none', 3000);
  }

  // ── LAGRE FORSIKRING ─────────────────────────────────────────────────
  async function saveForsikring() {
    const { data: { session } } = await db.auth.getSession();
    if (!session) return;
    const selskap = document.getElementById('forsikringSelskap').value;
    const dato = document.getElementById('forsikringDato').value;
    const pris = parseInt(document.getElementById('forsikringPris').value) || null;
    if (!selskap) { alert('Velg forsikringsselskap.'); return; }
    const { error: forsikringErr } = await db.from('forsikring_avtaler').upsert({
      user_id: session.user.id, selskap, pris,
      sist_sjekket: dato || new Date().toISOString().split('T')[0],
      bil: document.getElementById('fBil').checked,
      hjem: document.getElementById('fHjem').checked,
      hytte: document.getElementById('fHytte').checked,
      reise: document.getElementById('fReise').checked,
      person: document.getElementById('fPerson').checked,
    }, { onConflict: 'user_id' });
    if (forsikringErr) { alert('Lagring feilet: ' + forsikringErr.message); return; }
    document.getElementById('forsikringSaveMsg').style.display = 'block';
    // Oppdater kostnad i dashboard
    if (pris) {
      kostnadForsikring = pris;
      oppdaterMndKostnad();
    }
    // Status og farge basert på dato
    const dagerSiden = dato ? Math.floor((new Date()-new Date(dato))/86400000) : 999;
    const farge = dagerSiden < 180 ? 'green' : dagerSiden < 365 ? 'yellow' : 'red';
    const tidTekst = dato ? `Sist sjekket: ${new Date(dato).toLocaleDateString('no-NO')}` : 'Sjekket i dag';
    const prisInfo = pris ? `${selskap} · ${pris} kr/mnd` : selskap;
    oppdaterStatusKort('Forsikring', null, prisInfo, tidTekst, farge);
    setTimeout(() => document.getElementById('forsikringSaveMsg').style.display = 'none', 3000);
  }

  // ── LAGRE BREDBÅND ───────────────────────────────────────────────────
  async function saveBredband() {
    const { data: { session } } = await db.auth.getSession();
    if (!session) return;
    const lev = document.getElementById('bredbandLev').value;
    if (!lev) { alert('Velg leverandør.'); return; }
    const { error: bbErr } = await db.from('bredband_avtaler').upsert({
      user_id: session.user.id, leverandor: lev,
      hastighet: document.getElementById('bredbandHast').value,
      pris: parseInt(document.getElementById('bredbandPris').value)||null,
      sist_sjekket: new Date().toISOString().split('T')[0],
    }, { onConflict: 'user_id' });
    if (bbErr) { alert('Lagring feilet: ' + bbErr.message); return; }
    document.getElementById('bredbandSaveMsg').style.display = 'block';
    oppdaterStatusKort('Bredband', null, lev + ' · ' + (document.getElementById('bredbandHast').value||'?') + ' Mbit/s', 'Sjekket i dag', 'green');
    visBredbandAvtaleKort({ leverandor: lev, hastighet: document.getElementById('bredbandHast').value, pris: parseInt(document.getElementById('bredbandPris').value)||0 });
    setTimeout(() => document.getElementById('bredbandSaveMsg').style.display = 'none', 3000);
  }


  // ── MÅNEDLIG KOSTNAD OG AVTALE-KORT ─────────────────────────────────
  // Strøm-data fra sammenligningslisten (spot-snitt per område)
  const SPOTSNITT = { NO1: 82, NO2: 80, NO3: 65, NO4: 55, NO5: 78 };
  const STROM_ALTERNATIVER = [
    { navn:"Tibber",       emoji:"⚡", type:"spot", paslag:0, mnd:49,  url:"https://tibber.com/no" },
    { navn:"Cheap Energy", emoji:"💚", type:"spot", paslag:0, mnd:39,  url:"https://cheapenergy.no" },
    { navn:"Agva Kraft",   emoji:"🌊", type:"spot", paslag:0, mnd:29,  url:"https://agva.no" },
    { navn:"Klarkraft",    emoji:"☀️", type:"spot", paslag:1, mnd:29,  url:"https://klarkraft.no" },
    { navn:"Ishavskraft",  emoji:"❄️", type:"spot", paslag:2, mnd:39,  url:"https://ishavskraft.no" },
    { navn:"Fortum",       emoji:"🌍", type:"spot", paslag:3, mnd:49,  url:"https://fortum.no" },
    { navn:"Fjordkraft",   emoji:"🏔️", type:"spot", paslag:4, mnd:59,  url:"https://fjordkraft.no" },
  ];
  const MOBIL_ALTERNATIVER = [
    { navn:"Chilimobil", emoji:"🌶️", data:"5 GB",       pris:99,  url:"https://chilimobil.no" },
    { navn:"Talkmore",   emoji:"📞", data:"4 GB",        pris:179, url:"https://talkmore.no" },
    { navn:"ice",        emoji:"🧊", data:"Ubegrenset",  pris:249, url:"https://ice.no" },
    { navn:"OneCall",    emoji:"1️⃣", data:"5 GB",        pris:199, url:"https://onecall.no" },
    { navn:"PlussMobil", emoji:"➕", data:"1 GB",        pris:149, url:"https://plussmobil.no" },
    { navn:"Telia",      emoji:"🟣", data:"10 GB",       pris:299, url:"https://telia.no" },
    { navn:"Telenor",    emoji:"📡", data:"10 GB",       pris:319, url:"https://telenor.no" },
  ];

  // Globale kostnadsverdier for dashboard
  let kostnadStrom = null, kostnadMobil = null, kostnadBredband = null, kostnadForsikring = null;

  function oppdaterMndKostnad() {
    const nodvendig = (kostnadStrom||0) + (kostnadMobil||0) + (kostnadBredband||0) + (kostnadForsikring||0);
    const fritid    = kostnadAbonnement || 0;
    const total     = nodvendig + fritid;
    if (total === 0) return;

    document.getElementById('mndKostnadWrap').style.display = 'block';
    document.getElementById('mndTotalt').innerHTML = Math.round(total).toLocaleString('no-NO') + ' <span>kr/mnd</span>';
    document.getElementById('mndTotaltAar').innerHTML =
      '<strong>' + Math.round(total * 12).toLocaleString('no-NO') + ' kr/år</strong>estimert årsutgift';

    // Faste nødvendige
    document.getElementById('sumNodvendig').textContent = Math.round(nodvendig).toLocaleString('no-NO') + ' kr/mnd';
    if (kostnadStrom)      document.getElementById('mndStrom').textContent      = Math.round(kostnadStrom).toLocaleString('no-NO') + ' kr/mnd';
    if (kostnadMobil)      document.getElementById('mndMobil').textContent      = Math.round(kostnadMobil).toLocaleString('no-NO') + ' kr/mnd';
    if (kostnadBredband)   document.getElementById('mndBredband').textContent   = Math.round(kostnadBredband).toLocaleString('no-NO') + ' kr/mnd';
    if (kostnadForsikring) document.getElementById('mndForsikring').textContent = Math.round(kostnadForsikring).toLocaleString('no-NO') + ' kr/mnd';

    // Fritid
    document.getElementById('sumFritid').textContent = fritid > 0
      ? Math.round(fritid).toLocaleString('no-NO') + ' kr/mnd'
      : '— kr/mnd';

    // Sparetips
    genererSparetips();
    renderGrafer();
    oppdaterOkonomiSammendrag();
    genererBundleTips();
    oppdaterSpartOversikt();
    oppdaterSparerad();
  }

  function genererSparetips() {
    const tips = [];

    // Tip 1: ICE Ubegrenset inkl Netflix
    const harTelenorUbegrenset = (window._mobilData?.operator === 'Telenor' && window._mobilData?.data_gb === 'Ubegrenset');
    const harNetflix = mineAbonnement.some(a => a.id === 'netflix');
    if (harTelenorUbegrenset && harNetflix) {
      const mobilPris = window._mobilData?.pris || 0;
      const netflixPris = mineAbonnement.find(a => a.id === 'netflix')?.pris || 0;
      const icePris = 399; // ICE Max m/Netflix
      const bespar = (mobilPris + netflixPris) - icePris;
      if (bespar > 0) tips.push({
        ikon: '🧊',
        tekst: `Du betaler <strong>Telenor Ubegrenset + Netflix</strong> separat. ICE MAX inkluderer ubegrenset data OG Netflix for kun ${icePris} kr/mnd.`,
        besparelse: bespar
      });
    }

    // Tip 2: Spotify vs Apple Music
    const harSpotify = mineAbonnement.find(a => a.id === 'spotify');
    const harAppleMusic = mineAbonnement.find(a => a.id === 'apple_music');
    if (harSpotify && harAppleMusic) tips.push({
      ikon: '🎵',
      tekst: 'Du betaler for <strong>både Spotify og Apple Music</strong>. Velg én — de har nesten identisk katalog.',
      besparelse: Math.min(harSpotify.pris, harAppleMusic.pris)
    });

    // Tip 3: Viaplay Total vs TV2 Play + Viaplay separat
    const harViaplayTotal = mineAbonnement.find(a => a.id === 'viaplay_total');
    const harViaplayFS = mineAbonnement.find(a => a.id === 'viaplay_fs');
    if (harViaplayFS && !harViaplayTotal) tips.push({
      ikon: '⚽',
      tekst: 'Betaler du for Viaplay Film & Serier? <strong>Viaplay Total</strong> inkluderer i tillegg Premier League, F1 og mer for kun 399 kr/mnd.',
      besparelse: null
    });

    // Tip 4: Mange strømmtjenester
    const videoAbb = mineAbonnement.filter(a => ['netflix','disney','max','skyshowtime','viaplay_fs','amazon','discovery'].includes(a.id));
    if (videoAbb.length >= 3) {
      const totalVideo = videoAbb.reduce((s, a) => s + a.pris, 0);
      tips.push({
        ikon: '📺',
        tekst: `Du har <strong>${videoAbb.length} strømmtjenester</strong> som koster ${totalVideo} kr/mnd totalt. Vurder å rotere — se én ferdig, bytt til neste, pause de andre.`,
        besparelse: null
      });
    }

    // Tip 5: Avis + billigere alternativ
    const harAvis = mineAbonnement.filter(a => a.kat === 'avis' || ['vg','dagbladet','aftenposten','dn','bt'].includes(a.id));
    if (harAvis.length >= 2) tips.push({
      ikon: '📰',
      tekst: `Du har <strong>${harAvis.length} avisabonnement</strong>. Bibliotekets digitale tjenester (Pressreader) gir tilgang til hundrevis av aviser gratis med lånekort.`,
      besparelse: harAvis.reduce((s,a) => s + a.pris, 0)
    });

    // Tip 6: Ingen abonnementer registrert
    if (mineAbonnement.length === 0 && (kostnadMobil || kostnadStrom)) tips.push({
      ikon: '🎬',
      tekst: 'Legg til strømme- og musikktjenestene dine under <strong>Abonnementer</strong> for å få en komplett oversikt og sparetips.',
      besparelse: null
    });

    const seksjon = document.getElementById('sparetipsSeksjon');
    const liste = document.getElementById('sparetipsListe');
    if (tips.length === 0) { seksjon.style.display = 'none'; return; }
    seksjon.style.display = 'block';
    liste.innerHTML = tips.map(t => `
      <div class="sparetips-rad">
        <span class="sparetips-ikon">${t.ikon}</span>
        <div class="sparetips-tekst">
          ${t.tekst}
          ${t.besparelse ? '<div class="sparetips-besparelse">Spar ~' + t.besparelse.toLocaleString('no-NO') + ' kr/mnd</div>' : ''}
        </div>
      </div>`).join('');
  }

  function visStromAvtaleKort(maalere, omraade) {
    if (!maalere || maalere.length === 0) return;
    const spot = SPOTSNITT[omraade] || 82;
    const m = maalere[0];
    const forbrukMnd = (m.forbruk || 16000) / 12;
    const nettMnd = ((m.nettleie || 45) / 100) * forbrukMnd;

    // Estimer nåværende kostnad
    let egenOre = spot + 3; // antar 3 øre påslag hvis ukjent
    const egenMnd = Math.round((egenOre / 100) * forbrukMnd + nettMnd + (m.mnd || 0));
    kostnadStrom = egenMnd;
    oppdaterMndKostnad();

    // Finn billigere alternativer
    const alternativer = STROM_ALTERNATIVER
      .filter(a => a.navn.toLowerCase() !== (m.leverandor||'').toLowerCase())
      .map(a => {
        const aMnd = Math.round(((spot + a.paslag) / 100) * forbrukMnd + nettMnd + a.mnd);
        return { ...a, mndKost: aMnd, besparelse: egenMnd - aMnd };
      })
      .filter(a => a.besparelse > 0)
      .sort((a, b) => b.besparelse - a.besparelse)
      .slice(0, 3);

    const kortHTML = `
      <div class="min-avtale-kort">
        <div class="min-avtale-topp">
          <div>
            <div class="min-avtale-navn">Din strømavtale</div>
            <div class="min-avtale-leverandor">⚡ ${m.leverandor || 'Ukjent'}</div>
            <div class="min-avtale-detalj">${m.avtaletype || 'Spotpris'} · ${maalere.length} måler${maalere.length > 1 ? 'e' : ''}</div>
          </div>
          <div class="min-avtale-pris-wrap">
            <div class="min-avtale-pris">${egenMnd.toLocaleString('no-NO')} kr</div>
            <div class="min-avtale-pris-lbl">estimert/mnd</div>
          </div>
        </div>
        <div class="min-avtale-grid">
          <div class="min-avtale-felt"><div class="min-avtale-felt-lbl">Årsforbruk</div><div class="min-avtale-felt-val">${(m.forbruk||16000).toLocaleString('no-NO')} kWh</div></div>
          <div class="min-avtale-felt"><div class="min-avtale-felt-lbl">Nettleie</div><div class="min-avtale-felt-val">${m.nettleie || '–'} øre/kWh</div></div>
          <div class="min-avtale-felt"><div class="min-avtale-felt-lbl">Strømområde</div><div class="min-avtale-felt-val">${omraade}</div></div>
          <div class="min-avtale-felt"><div class="min-avtale-felt-lbl">Årsestimert</div><div class="min-avtale-felt-val">${(egenMnd*12).toLocaleString('no-NO')} kr</div></div>
        </div>
        <div class="alternativer-seksjon">
          <div class="alternativer-tittel">💡 Billigere alternativer for deg</div>
          ${alternativer.length > 0 ? alternativer.map((a, i) => `
            <div class="alternativ-rad ${i === 0 ? 'beste' : ''}">
              <div class="alternativ-info">
                <span class="alternativ-ikon">${a.emoji}</span>
                <div>
                  <div class="alternativ-navn">${a.navn}</div>
                  <div class="alternativ-type">+${a.paslag} øre/kWh · ${a.mnd} kr/mnd</div>
                </div>
              </div>
              <div class="alternativ-pris-wrap">
                <div class="alternativ-pris">${a.mndKost.toLocaleString('no-NO')} kr/mnd</div>
                <div class="alternativ-besparelse">Spar ${a.besparelse.toLocaleString('no-NO')} kr/mnd</div>
              </div>
              <a href="${a.url}" target="_blank" class="btn-bytt-sm">Bytt nå</a>
            </div>`).join('') : '<div class="ingen-alternativer">✅ Du har allerede en av de billigste avtalene!</div>'}
        </div>
      </div>`;

    const wrap = document.getElementById('stromAvtaleKort');
    wrap.innerHTML = kortHTML;
    wrap.style.display = 'block';
  }

  function visMobilAvtaleKort(data) {
    if (!data || !data.operator) return;
    const pris = data.pris || 0;
    const antall = data.antall || 1;
    const totalMnd = pris * antall;
    kostnadMobil = totalMnd;
    oppdaterMndKostnad();

    // Parse GB-tall fra data_gb streng (f.eks "10 GB" -> 10, "Ubegrenset" -> 999)
    function parseGB(str) {
      if (!str) return 0;
      if (str.toLowerCase().includes('ubegrenset')) return 999;
      const n = parseInt(str);
      return isNaN(n) ? 0 : n;
    }
    const brukerGB = parseGB(data.data_gb);

    const alternativer = MOBIL_ALTERNATIVER
      .filter(a => a.navn.toLowerCase() !== data.operator.toLowerCase())
      .filter(a => {
        const aGB = parseGB(a.data);
        // Kun vis alternativer med samme eller mer data
        return aGB >= brukerGB || a.data === data.data_gb;
      })
      .filter(a => a.pris < pris)
      .sort((a, b) => {
        // Sorter: tilsvarende data-tier først, deretter billigst
        const aGB = parseGB(a.data);
        const bGB = parseGB(b.data);
        const aSamme = aGB === brukerGB ? 0 : 1;
        const bSamme = bGB === brukerGB ? 0 : 1;
        if (aSamme !== bSamme) return aSamme - bSamme;
        return a.pris - b.pris;
      })
      .slice(0, 3);

    const kortHTML = `
      <div class="min-avtale-kort">
        <div class="min-avtale-topp">
          <div>
            <div class="min-avtale-navn">Ditt mobilabonnement</div>
            <div class="min-avtale-leverandor">📱 ${data.operator}</div>
            <div class="min-avtale-detalj">${data.data_gb || '–'} · ${antall} abonnement</div>
          </div>
          <div class="min-avtale-pris-wrap">
            <div class="min-avtale-pris">${totalMnd.toLocaleString('no-NO')} kr</div>
            <div class="min-avtale-pris-lbl">per mnd totalt</div>
          </div>
        </div>
        <div class="min-avtale-grid">
          <div class="min-avtale-felt"><div class="min-avtale-felt-lbl">Operatør</div><div class="min-avtale-felt-val">${data.operator}</div></div>
          <div class="min-avtale-felt"><div class="min-avtale-felt-lbl">Data</div><div class="min-avtale-felt-val">${data.data_gb || '–'}</div></div>
          <div class="min-avtale-felt"><div class="min-avtale-felt-lbl">Pris per abb.</div><div class="min-avtale-felt-val">${pris} kr/mnd</div></div>
          <div class="min-avtale-felt"><div class="min-avtale-felt-lbl">Årsestimert</div><div class="min-avtale-felt-val">${(totalMnd*12).toLocaleString('no-NO')} kr</div></div>
        </div>
        <div class="alternativer-seksjon">
          <div class="alternativer-tittel">💡 Billigere alternativer</div>
          ${alternativer.length > 0 ? alternativer.map((a, i) => `
            <div class="alternativ-rad ${i === 0 ? 'beste' : ''}">
              <div class="alternativ-info">
                <span class="alternativ-ikon">${a.emoji}</span>
                <div>
                  <div class="alternativ-navn">${a.navn}</div>
                  <div class="alternativ-type">${a.data}</div>
                </div>
              </div>
              <div class="alternativ-pris-wrap">
                <div class="alternativ-pris">${a.pris} kr/mnd</div>
                <div class="alternativ-besparelse">Spar ${(pris - a.pris).toLocaleString('no-NO')} kr/mnd</div>
              </div>
              <a href="${a.url}" target="_blank" class="btn-bytt-sm">Bytt nå</a>
            </div>`).join('') : '<div class="ingen-alternativer">✅ Du har allerede et av de billigste abonnementene!</div>'}
        </div>
      </div>`;

    const wrap = document.getElementById('mobilAvtaleKort');
    wrap.innerHTML = kortHTML;
    wrap.style.display = 'block';
  }

  function visBredbandAvtaleKort(data) {
    if (!data || !data.leverandor) return;
    const pris = data.pris || 0;
    kostnadBredband = pris;
    oppdaterMndKostnad();

    const kortHTML = `
      <div class="min-avtale-kort">
        <div class="min-avtale-topp">
          <div>
            <div class="min-avtale-navn">Din bredbåndsavtale</div>
            <div class="min-avtale-leverandor">📡 ${data.leverandor}</div>
            <div class="min-avtale-detalj">${data.hastighet ? data.hastighet + ' Mbit/s' : '–'}</div>
          </div>
          <div class="min-avtale-pris-wrap">
            <div class="min-avtale-pris">${pris.toLocaleString('no-NO')} kr</div>
            <div class="min-avtale-pris-lbl">per mnd</div>
          </div>
        </div>
        <div class="min-avtale-grid">
          <div class="min-avtale-felt"><div class="min-avtale-felt-lbl">Leverandør</div><div class="min-avtale-felt-val">${data.leverandor}</div></div>
          <div class="min-avtale-felt"><div class="min-avtale-felt-lbl">Hastighet</div><div class="min-avtale-felt-val">${data.hastighet || '–'} Mbit/s</div></div>
          <div class="min-avtale-felt"><div class="min-avtale-felt-lbl">Årsestimert</div><div class="min-avtale-felt-val">${(pris*12).toLocaleString('no-NO')} kr</div></div>
        </div>
        <div class="alternativer-seksjon">
          <div class="alternativer-tittel">💡 Alternativ</div>
          <div class="ingen-alternativer">🔜 Bredbåndssammenligning kommer snart</div>
        </div>
      </div>`;

    const wrap = document.getElementById('bredbandAvtaleKort');
    wrap.innerHTML = kortHTML;
    wrap.style.display = 'block';
  }


  async function loadMobilData(userId) {
    const { data } = await db.from('mobil_avtaler').select('*').eq('user_id', userId).single();
    if (!data) return;
    document.getElementById('mobilOperator').value = data.operator || '';
    document.getElementById('mobilData').value     = data.data_gb  || '';
    document.getElementById('mobilPris').value     = data.pris     || '';
    document.getElementById('mobilAntall').value   = data.antall   || 1;
    window._mobilData = data;
    oppdaterStatusKort('Mobil', null, (data.operator||'') + ' · ' + (data.data_gb||''), 'Sjekket i dag', 'green');
    visMobilAvtaleKort(data);
  }

  async function loadForsikringData(userId) {
    const { data } = await db.from('forsikring_avtaler').select('*').eq('user_id', userId).single();
    if (!data) return;
    document.getElementById('forsikringSelskap').value = data.selskap      || '';
    document.getElementById('forsikringPris').value    = data.pris         || '';
    document.getElementById('forsikringDato').value    = data.sist_sjekket || '';
    if (data.bil)    document.getElementById('fBil').checked    = true;
    if (data.hjem)   document.getElementById('fHjem').checked   = true;
    if (data.hytte)  document.getElementById('fHytte').checked  = true;
    if (data.reise)  document.getElementById('fReise').checked  = true;
    if (data.person) document.getElementById('fPerson').checked = true;
    const dagerSiden = data.sist_sjekket ? Math.floor((new Date()-new Date(data.sist_sjekket))/86400000) : 999;
    const farge = dagerSiden < 180 ? 'green' : dagerSiden < 365 ? 'yellow' : 'red';
    const tidTekst = data.sist_sjekket ? 'Sist sjekket: ' + new Date(data.sist_sjekket).toLocaleDateString('no-NO') : 'Sjekket i dag';
    const prisInfo = data.pris ? `${data.selskap} · ${data.pris} kr/mnd` : data.selskap;
    oppdaterStatusKort('Forsikring', null, prisInfo, tidTekst, farge);
    if (data.pris) { kostnadForsikring = data.pris; oppdaterMndKostnad(); }
  }

  async function loadBredbandData(userId) {
    const { data } = await db.from('bredband_avtaler').select('*').eq('user_id', userId).single();
    if (!data) return;
    document.getElementById('bredbandLev').value   = data.leverandor || '';
    document.getElementById('bredbandHast').value  = data.hastighet  || '';
    document.getElementById('bredbandPris').value  = data.pris       || '';
    oppdaterStatusKort('Bredband', null, (data.leverandor||'') + ' · ' + (data.hastighet||'') + ' Mbit/s', 'Sjekket i dag', 'green');
    visBredbandAvtaleKort(data);
  }


  // ── ABONNEMENT KATALOG DATA ───────────────────────────────────────────
  const KATALOG = [
    // MUSIKK
    { id:'spotify', navn:'Spotify', logo:'🎵', kat:'musikk', url:'https://spotify.com', pakker:[
      { navn:'Student', pris:75 }, { navn:'Individuell', pris:139 },
      { navn:'Duo', pris:189 }, { navn:'Familie (6 pers)', pris:219 }
    ]},
    { id:'apple_music', navn:'Apple Music', logo:'🍎', kat:'musikk', url:'https://music.apple.com', pakker:[
      { navn:'Student', pris:69 }, { navn:'Individuell', pris:129 },
      { navn:'Familie (6 pers)', pris:199 }
    ]},
    { id:'tidal', navn:'Tidal', logo:'🌊', kat:'musikk', url:'https://tidal.com', pakker:[
      { navn:'Individual', pris:109 }, { navn:'Family', pris:179 }
    ]},
    { id:'youtube_music', navn:'YouTube Music', logo:'▶️', kat:'musikk', url:'https://music.youtube.com', pakker:[
      { navn:'Individuell', pris:109 }, { navn:'Familie', pris:169 }
    ]},
    // VIDEO
    { id:'netflix', navn:'Netflix', logo:'🎬', kat:'video', url:'https://netflix.com', pakker:[
      { navn:'Standard m/reklame', pris:109 }, { navn:'Standard', pris:149 },
      { navn:'Premium (4K)', pris:199 }
    ]},
    { id:'disney', navn:'Disney+', logo:'✨', kat:'video', url:'https://disneyplus.com', pakker:[
      { navn:'Standard m/reklame', pris:69 }, { navn:'Standard', pris:109 },
      { navn:'Premium (4K)', pris:159 }
    ]},
    { id:'max', navn:'Max (HBO)', logo:'📡', kat:'video', url:'https://www.hbomax.com/no', pakker:[
      { navn:'Basis', pris:129 }, { navn:'Standard', pris:149 },
      { navn:'Ultimate', pris:199 }
    ]},
    { id:'skyshowtime', navn:'SkyShowtime', logo:'🎭', kat:'video', url:'https://skyshowtime.com', pakker:[
      { navn:'Standard', pris:129 }
    ]},
    { id:'amazon', navn:'Amazon Prime Video', logo:'📦', kat:'video', url:'https://primevideo.com', pakker:[
      { navn:'Prime Video', pris:79 }
    ]},
    { id:'discovery', navn:'Discovery+', logo:'🔭', kat:'video', url:'https://discoveryplus.com/no', pakker:[
      { navn:'Standard', pris:89 }
    ]},
    { id:'viaplay_fs', navn:'Viaplay Film & Serier', logo:'🎥', kat:'video', url:'https://viaplay.com/no', pakker:[
      { navn:'Film & Serier', pris:169 }
    ]},
    { id:'nrk', navn:'NRK TV', logo:'📻', kat:'video', url:'https://tv.nrk.no', pakker:[
      { navn:'Gratis (lisensfinansiert)', pris:0 }
    ]},
    // SPORT
    { id:'viaplay_total', navn:'Viaplay Total', logo:'⚽', kat:'sport', url:'https://viaplay.com/no', pakker:[
      { navn:'Viaplay Total (Premier League, F1, m.m.)', pris:399 }
    ]},
    { id:'tv2_sport', navn:'TV2 Play Sport', logo:'🏆', kat:'sport', url:'https://tv2.no/play', pakker:[
      { navn:'TV2 Play Basis', pris:99 }, { navn:'TV2 Play Total (Champions League, Eliteserien)', pris:389 }
    ]},
    { id:'eurosport', navn:'Discovery+ Sport', logo:'🚴', kat:'sport', url:'https://discoveryplus.com', pakker:[
      { navn:'Standard', pris:89 }, { navn:'Med Eurosport', pris:129 }
    ]},
    // AVIS / NYHETER
    { id:'vg', navn:'VG+', logo:'📰', kat:'avis', url:'https://vg.no', pakker:[
      { navn:'Digital', pris:149 }
    ]},
    { id:'dagbladet', navn:'Dagbladet+', logo:'📱', kat:'avis', url:'https://dagbladet.no', pakker:[
      { navn:'Digital', pris:129 }
    ]},
    { id:'aftenposten', navn:'Aftenposten', logo:'📄', kat:'avis', url:'https://aftenposten.no', pakker:[
      { navn:'Digital', pris:249 }, { navn:'Familie', pris:349 }
    ]},
    { id:'dn', navn:'Dagens Næringsliv', logo:'💼', kat:'avis', url:'https://dn.no', pakker:[
      { navn:'Digital', pris:299 }
    ]},
    { id:'bt', navn:'Bergens Tidende', logo:'🗞️', kat:'avis', url:'https://bt.no', pakker:[
      { navn:'Digital', pris:219 }
    ]},
    // TRENING
    { id:'sats', navn:'SATS', logo:'💪', kat:'trening', url:'https://sats.no', pakker:[
      { navn:'Smart (1 senter)', pris:349 }, { navn:'All SATS (alle sentre)', pris:529 },
      { navn:'Elite', pris:699 }
    ]},
    { id:'evo', navn:'Evo Fitness', logo:'🏋️', kat:'trening', url:'https://evofitness.no', pakker:[
      { navn:'Standard', pris:299 }, { navn:'Plus (alle sentre)', pris:399 }
    ]},
    { id:'fresh', navn:'Fresh Fitness', logo:'🔥', kat:'trening', url:'https://freshfitness.no', pakker:[
      { navn:'Standard', pris:249 }, { navn:'Plus', pris:349 }
    ]},
    // ANNET
    { id:'youtube_premium', navn:'YouTube Premium', logo:'▶️', kat:'annet', url:'https://youtube.com/premium', pakker:[
      { navn:'Individuell', pris:109 }, { navn:'Familie', pris:169 }
    ]},
    { id:'icloud', navn:'iCloud+', logo:'☁️', kat:'annet', url:'https://apple.com/icloud', pakker:[
      { navn:'50 GB', pris:14 }, { navn:'200 GB', pris:39 }, { navn:'2 TB', pris:109 }
    ]},
    { id:'microsoft365', navn:'Microsoft 365', logo:'📊', kat:'annet', url:'https://microsoft.com/microsoft-365', pakker:[
      { navn:'Personal', pris:99 }, { navn:'Familie (6 pers)', pris:129 }
    ]},
    { id:'adobe', navn:'Adobe Creative Cloud', logo:'🎨', kat:'annet', url:'https://adobe.com', pakker:[
      { navn:'Fotografi', pris:199 }, { navn:'Alle apper', pris:699 }
    ]},
    { id:'storytel', navn:'Storytel', logo:'📚', kat:'annet', url:'https://storytel.com', pakker:[
      { navn:'1 bruker', pris:199 }, { navn:'Familie', pris:269 }
    ]},
    { id:'audible', navn:'Audible', logo:'🎧', kat:'annet', url:'https://audible.com', pakker:[
      { navn:'Standard', pris:129 }
    ]},
  ];

  let mineAbonnement = []; // { id, navn, logo, pakke, pris }
  let aktivtKatalogFilter = 'alle';
  let apentKortId = null;
  let kostnadAbonnement = 0;

  function filtrerKatalog(kat, btn) {
    aktivtKatalogFilter = kat;
    document.querySelectorAll('.kat-btn').forEach(b => b.classList.remove('aktiv'));
    btn.classList.add('aktiv');
    lukkPakkeVelger();
    renderKatalog();
  }

  function renderKatalog() {
    const grid = document.getElementById('katalogGrid');
    const vis = aktivtKatalogFilter === 'alle'
      ? KATALOG
      : KATALOG.filter(k => k.kat === aktivtKatalogFilter);

    grid.innerHTML = vis.map(k => {
      const erValgt = mineAbonnement.some(a => a.id === k.id);
      const fraStr = k.pakker[0].pris === 0 ? 'Gratis' : 'fra ' + k.pakker[0].pris + ' kr/mnd';
      return `<div class="katalog-kort ${erValgt ? 'valgt' : ''}" onclick="apneKort('${k.id}')">
        ${erValgt ? '<span class="katalog-valgt-badge">✓ Lagt til</span>' : ''}
        <div class="katalog-logo">${k.logo}</div>
        <div class="katalog-navn">${k.navn}</div>
        <div class="katalog-fra">${fraStr}</div>
      </div>`;
    }).join('');
  }

  function apneKort(id) {
    const tjeneste = KATALOG.find(k => k.id === id);
    if (!tjeneste) return;

    // Fjern hvis klikker på allerede åpent
    if (apentKortId === id) { lukkPakkeVelger(); return; }
    apentKortId = id;

    const velger = document.getElementById('pakkeVelger');
    document.getElementById('pakkeVelgerTittel').textContent = tjeneste.logo + ' ' + tjeneste.navn + ' — velg pakke';
    document.getElementById('pakkeListe').innerHTML = tjeneste.pakker.map(p => {
      const erValgt = mineAbonnement.some(a => a.id === id && a.pakke === p.navn);
      return `<div class="pakke-rad ${erValgt ? 'valgt' : ''}" onclick="velgPakke('${id}', '${p.navn}', ${p.pris})">
        <span class="pakke-navn">${p.navn}</span>
        <span class="pakke-pris">${p.pris === 0 ? 'Gratis' : p.pris + ' kr/mnd'}</span>
      </div>`;
    }).join('');
    velger.classList.add('vis');
    velger.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function lukkPakkeVelger() {
    apentKortId = null;
    document.getElementById('pakkeVelger').classList.remove('vis');
  }

  function velgPakke(id, pakkeNavn, pris) {
    const tjeneste = KATALOG.find(k => k.id === id);
    // Fjern evt eksisterende for denne tjenesten
    mineAbonnement = mineAbonnement.filter(a => a.id !== id);
    // Legg til ny (med mindre det var valgt allerede)
    mineAbonnement.push({ id, navn: tjeneste.navn, logo: tjeneste.logo, kat: tjeneste.kat, pakke: pakkeNavn, pris });
    lukkPakkeVelger();
    renderKatalog();
    renderMineAbonnement();
  }

  function fjernAbonnement(id) {
    mineAbonnement = mineAbonnement.filter(a => a.id !== id);
    renderKatalog();
    renderMineAbonnement();
  }

  function renderMineAbonnement() {
    const liste = document.getElementById('mineAbbListe');
    if (mineAbonnement.length === 0) {
      liste.innerHTML = '<p style="font-size:0.85rem;color:var(--muted)">Ingen abonnementer lagt til ennå.</p>';
      kostnadAbonnement = 0;
      oppdaterMndKostnad();
      document.getElementById('mndAbonnement').innerHTML = '<span class="mangler">Ikke registrert</span>';
      document.getElementById('sdotAbonnement').className = 'sidebar-dot';
      return;
    }
    const total = mineAbonnement.reduce((sum, a) => sum + a.pris, 0);
    kostnadAbonnement = total;

    liste.innerHTML = mineAbonnement.map(a => `
      <div class="mine-abb-rad" data-abb-id="${a.id}" title="Klikk for å legge til trekkdato">
        <div class="mine-abb-info">
          <span class="mine-abb-logo">${a.logo}</span>
          <div>
            <div class="mine-abb-navn">${a.navn} ${a.trekkdag ? '<span style="font-size:0.72rem;color:var(--lime)">dag '+a.trekkdag+'</span>' : ''}</div>
            <div class="mine-abb-pakke">${a.pakke}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;">
          <span class="mine-abb-pris">${a.pris === 0 ? 'Gratis' : a.pris + ' kr/mnd'}</span>
          <button class="mine-abb-fjern" onclick="event.stopPropagation();fjernAbonnement('${a.id}')">✕</button>
        </div>
      </div>`).join('') + `
      <div class="mine-abb-total">
        <span>Total abonnementer</span>
        <span>${total.toLocaleString('no-NO')} kr/mnd</span>
      </div>`;

    // Oppdater fritid-linjer i dashboard
    const linjerEl = document.getElementById('mndAbonnementLinjer');
    const totalEl = document.getElementById('mndAbonnementTotal');
    if (mineAbonnement.length > 0) {
      linjerEl.innerHTML = mineAbonnement.map(a =>
        `<div class="mnd-kostnad-linje"><span class="linje-lbl">${a.logo} ${a.navn}</span><span class="linje-val">${a.pris === 0 ? 'Gratis' : a.pris + ' kr'}</span></div>`
      ).join('');
      totalEl.style.display = 'flex';
      document.getElementById('mndAbonnement').textContent = total.toLocaleString('no-NO') + ' kr/mnd';
    } else {
      linjerEl.innerHTML = '<div class="mnd-kostnad-linje"><span class="linje-lbl" style="color:rgba(255,255,255,0.2);font-style:italic">Ingen lagt til</span></div>';
      totalEl.style.display = 'none';
    }

    oppdaterMndKostnad();
    document.getElementById('sdotAbonnement').className = 'sidebar-dot green';
    setTimeout(() => { renderMineAbonnementMedTrekk(); renderTrekkKalender(); }, 50);
  }

  async function saveAbonnement() {
    const { data: { session } } = await db.auth.getSession();
    if (!session) return;
    // Lagrer lokalt i nettleseren (synkroniseres til sky i neste versjon)
    const key = 'abb_' + session.user.id;
    localStorage.setItem(key, JSON.stringify(mineAbonnement));
    document.getElementById('abonnementSaveMsg').style.display = 'block';
    setTimeout(() => document.getElementById('abonnementSaveMsg').style.display = 'none', 3000);
  }

  async function loadAbonnementData(userId) {
    const key = 'abb_' + userId;
    const lagret = localStorage.getItem(key);
    if (!lagret) return;
    try { mineAbonnement = JSON.parse(lagret); } catch(e) { mineAbonnement = []; }
    renderKatalog();
    renderMineAbonnement();
  }


  // ── BOLK 1: PROFIL UTVIDELSE ─────────────────────────────────────────
  // ── NAVIGASJON ──────────────────────────────────────────────────────────────
  function byttSeksjon(navn, btn) {
    if (navn === 'prishistorikk') renderPrishistorikk();
    if (navn === 'sparerad') { oppdaterSparerad(); lastRenteFraFinansportalen(); }
    if (navn === 'okonomi') { oppdaterOkonomiSammendrag(); renderTrekkKalender(); lastLaanFraFinansportalen(); }
    document.querySelectorAll('.dash-seksjon').forEach(s => s.classList.remove('aktiv'));
    document.querySelectorAll('.sidebar-link').forEach(b => b.classList.remove('aktiv'));
    const seksjonId = 'seksjon' + navn.charAt(0).toUpperCase() + navn.slice(1);
    const el = document.getElementById(seksjonId);
    if (el) el.classList.add('aktiv');
    document.querySelectorAll('.sidebar-link').forEach(b => {
      if (b.getAttribute('onclick') && b.getAttribute('onclick').includes("'" + navn + "'")) {
        b.classList.add('aktiv');
      }
    });
  }

  // ── ONBOARDING ──────────────────────────────────────────────────────────────
  function lukkOnboarding() {
    document.getElementById('onboardingOverlay').style.display = 'none';
    localStorage.setItem('ob_fullfort', '1');
  }

  function beregnMndLonn() {
    const aar = parseInt(document.getElementById('profLonnAar').value) || 0;
    if (!aar) return;
    // Enkel norsk skattekalkulator (ca 33% skatt på vanlig lønn)
    const skatt = aar < 300000 ? 0.26 : aar < 600000 ? 0.31 : 0.37;
    const netto = Math.round((aar * (1 - skatt)) / 12);
    document.getElementById('profLonnMnd').value = netto;
  }

  document.addEventListener('change', function(e) {
    if (e.target.id === 'profBolig') {
      const eier = e.target.value === 'eier';
      document.getElementById('husleieGruppe').style.display = eier ? 'none' : 'block';
      document.getElementById('laanSeksjon').style.display = eier ? 'block' : 'none';
    }
    if (e.target.id === 'stromOppstart') {
      document.getElementById('stromDatoGruppe').style.display =
        e.target.value === 'dato' ? 'block' : 'none';
    }
  });

  // ── LÅN ──────────────────────────────────────────────────────────────
  let laanerListe = [];

  function leggTilLaan() {
    const id = 'laan_' + Date.now();
    laanerListe.push({ id, type: 'bolig', sum: '', rente: '', mnd: '' });
    renderLaan();
  }

  function fjernLaan(id) {
    laanerListe = laanerListe.filter(l => l.id !== id);
    renderLaan();
  }

  function renderLaan() {
    const el = document.getElementById('laanListe');
    if (!el) return;
    el.innerHTML = laanerListe.map(l => `
      <div class="laan-kort">
        <div class="laan-header">
          <span>🏦 Lån</span>
          <button class="mine-abb-fjern" onclick="fjernLaan('${l.id}')">✕</button>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Type lån</label>
            <select onchange="oppdaterLaan('${l.id}','type',this.value)">
              <option value="bolig" ${l.type==='bolig'?'selected':''}>Boliglån</option>
              <option value="bil" ${l.type==='bil'?'selected':''}>Billån</option>
              <option value="forbruk" ${l.type==='forbruk'?'selected':''}>Forbrukslån</option>
              <option value="student" ${l.type==='student'?'selected':''}>Studielån</option>
            </select>
          </div>
          <div class="form-group">
            <label>Rentesats (%)</label>
            <input type="number" step="0.1" value="${l.rente}" placeholder="f.eks. 5.2"
              onchange="oppdaterLaan('${l.id}','rente',this.value)" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Gjenstående beløp (kr)</label>
            <input type="number" value="${l.sum}" placeholder="f.eks. 2500000"
              onchange="oppdaterLaan('${l.id}','sum',this.value)" />
          </div>
          <div class="form-group">
            <label>Månedlig terminbeløp (kr)</label>
            <input type="number" value="${l.mnd}" placeholder="f.eks. 12000"
              onchange="oppdaterLaan('${l.id}','mnd',this.value)" />
          </div>
        </div>
      </div>`).join('');
  }

  function oppdaterLaan(id, felt, val) {
    const laan = laanerListe.find(l => l.id === id);
    if (laan) { laan[felt] = val; oppdaterOkonomiSammendrag(); }
  }

  // ── BOLK 3: ØKONOMI SAMMENDRAG ────────────────────────────────────────
  function oppdaterOkonomiSammendrag() {
    const mndNetto = parseInt(document.getElementById('profLonnMnd')?.value) || 0;
    const husleie = parseInt(document.getElementById('profHusleie')?.value) || 0;
    const laanMnd = laanerListe.reduce((s, l) => s + (parseInt(l.mnd) || 0), 0);
    const bolig = husleie + laanMnd;
    const faste = (kostnadStrom||0) + (kostnadMobil||0) + (kostnadBredband||0) + (kostnadForsikring||0);
    const fritid = kostnadAbonnement || 0;
    const totUtgift = bolig + faste + fritid;
    const igjen = mndNetto - totUtgift;

    if (mndNetto > 0) {
      document.getElementById('okInntekt').textContent = mndNetto.toLocaleString('no-NO') + ' kr';
    }
    if (bolig > 0) document.getElementById('okBolig').textContent = bolig.toLocaleString('no-NO') + ' kr';
    if (faste > 0) document.getElementById('okFaste').textContent = Math.round(faste).toLocaleString('no-NO') + ' kr';
    if (fritid > 0) document.getElementById('okFritid').textContent = fritid.toLocaleString('no-NO') + ' kr';

    const igjenEl = document.getElementById('okIgjen');
    if (mndNetto > 0) {
      igjenEl.textContent = igjen.toLocaleString('no-NO') + ' kr/mnd';
      igjenEl.className = 'okonomi-val' + (igjen < 0 ? ' negativ' : '');
    }

    // Oppdater dashboard frihet-graf
    if (mndNetto > 0) renderGrafFrihet(mndNetto, bolig, Math.round(faste), fritid);
  }

  // ── TREKKDATO ─────────────────────────────────────────────────────────
  let aktivTrekkId = null;

  function renderMineAbonnementMedTrekk() {
    // Called from renderMineAbonnement — adds click-to-add trekkdato
    document.querySelectorAll('.mine-abb-rad').forEach(rad => {
      rad.style.cursor = 'pointer';
      rad.addEventListener('click', function() {
        const id = this.dataset.abbId;
        if (!id) return;
        aktivTrekkId = id;
        const abb = mineAbonnement.find(a => a.id === id);
        document.getElementById('trekkdatoTittel').textContent =
          (abb?.logo || '') + ' ' + (abb?.navn || '') + ' — trekkdato';
        document.getElementById('trekkdatoInput').value = abb?.trekkdag || '';
        document.getElementById('trekkdatoEditor').style.display = 'block';
      });
    });
  }

  function lagreTrekkdato() {
    if (!aktivTrekkId) return;
    const dag = parseInt(document.getElementById('trekkdatoInput').value);
    const abb = mineAbonnement.find(a => a.id === aktivTrekkId);
    if (abb && dag >= 1 && dag <= 31) {
      abb.trekkdag = dag;
      document.getElementById('trekkdatoEditor').style.display = 'none';
      aktivTrekkId = null;
      renderTrekkKalender();
    }
  }

  function renderTrekkKalender() {
    const kalEl = document.getElementById('trekkKalender');
    const listeEl = document.getElementById('trekkListe');
    if (!kalEl) return;

    const iDag = new Date().getDate();
    const dagerIMnd = new Date(new Date().getFullYear(), new Date().getMonth()+1, 0).getDate();
    const medTrekk = mineAbonnement.filter(a => a.trekkdag);

    // Kalender
    let html = '';
    for (let d = 1; d <= dagerIMnd; d++) {
      const trekk = medTrekk.filter(a => a.trekkdag === d);
      html += `<div class="trekk-dag ${trekk.length ? 'har-trekk' : ''} ${d === iDag ? 'i-dag' : ''}">
        <span class="dag-nr">${d}</span>
        ${trekk.map(a => `<span class="dag-abb">${a.logo}</span>`).join('')}
      </div>`;
    }
    kalEl.innerHTML = html;

    // Liste sortert etter dato
    if (medTrekk.length > 0) {
      const sortert = [...medTrekk].sort((a,b) => a.trekkdag - b.trekkdag);
      listeEl.innerHTML = sortert.map(a => `
        <div class="mine-abb-rad">
          <div class="mine-abb-info">
            <span class="mine-abb-logo">${a.logo}</span>
            <div>
              <div class="mine-abb-navn">${a.navn} <span style="color:var(--muted);font-weight:400">— ${a.pakke}</span></div>
              <div class="mine-abb-pakke">Trekkes dag ${a.trekkdag} hver måned</div>
            </div>
          </div>
          <span class="mine-abb-pris">${a.pris === 0 ? 'Gratis' : a.pris + ' kr'}</span>
        </div>`).join('');
    } else {
      listeEl.innerHTML = '<p style="font-size:0.85rem;color:var(--muted)">Ingen trekkdatoer lagt til ennå. Klikk et abonnement ovenfor.</p>';
    }
  }

  // ── BOLK 4: GRAFER ────────────────────────────────────────────────────
  let grafKostnadChart = null;
  let grafFrihetChart = null;

  function renderGrafer() {
    const nodvendig = (kostnadStrom||0) + (kostnadMobil||0) + (kostnadBredband||0) + (kostnadForsikring||0);
    const fritid = kostnadAbonnement || 0;
    if (nodvendig + fritid === 0) return;

    document.getElementById('graferWrap').style.display = 'block';
    renderGrafKostnad(nodvendig, fritid);
  }

  function renderGrafKostnad(nodvendig, fritid) {
    const ctx = document.getElementById('grafKostnad');
    if (!ctx) return;
    if (grafKostnadChart) grafKostnadChart.destroy();

    const labels = [];
    const data = [];
    const colors = [];
    if (kostnadStrom)      { labels.push('⚡ Strøm');       data.push(Math.round(kostnadStrom));      colors.push('rgba(182,240,96,0.8)'); }
    if (kostnadMobil)      { labels.push('📱 Mobil');       data.push(Math.round(kostnadMobil));      colors.push('rgba(96,165,250,0.8)'); }
    if (kostnadBredband)   { labels.push('📡 Bredbånd');    data.push(Math.round(kostnadBredband));   colors.push('rgba(251,191,36,0.8)'); }
    if (kostnadForsikring) { labels.push('🛡️ Forsikring');  data.push(Math.round(kostnadForsikring)); colors.push('rgba(167,139,250,0.8)'); }
    if (fritid > 0)        { labels.push('🎬 Fritid');      data.push(Math.round(fritid));            colors.push('rgba(248,113,113,0.8)'); }

    grafKostnadChart = new Chart(ctx, {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 6 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 400 },
        plugins: {
          legend: { position: 'bottom', labels: { color: 'rgba(255,255,255,0.6)', font: { size: 11 }, padding: 10, boxWidth: 12 } },
          tooltip: { callbacks: { label: ctx => ' ' + ctx.parsed.toLocaleString('no-NO') + ' kr/mnd' } }
        }
      }
    });
  }

  function renderGrafFrihet(inntekt, bolig, faste, fritid) {
    const ctx = document.getElementById('grafFrihet');
    if (!ctx) return;
    if (grafFrihetChart) grafFrihetChart.destroy();
    const totUtgift = bolig + faste + fritid;
    const igjen = Math.max(0, inntekt - totUtgift);

    grafFrihetChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['🏠 Bolig/lån', '📋 Faste avtaler', '🎬 Fritid', '💚 Disponibelt'],
        datasets: [{
          data: [bolig, faste, fritid, igjen],
          backgroundColor: ['rgba(248,113,113,0.8)','rgba(251,191,36,0.8)','rgba(139,92,246,0.8)','rgba(182,240,96,0.8)'],
          borderWidth: 0, hoverOffset: 6
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 400 },
        plugins: {
          legend: { position: 'bottom', labels: { color: 'rgba(255,255,255,0.6)', font: { size: 11 }, padding: 10, boxWidth: 12 } },
          tooltip: { callbacks: { label: ctx => ' ' + ctx.parsed.toLocaleString('no-NO') + ' kr/mnd' } }
        }
      }
    });
  }



  // ═══════════════════════════════════════════════════════════════
  // FINANSPORTALEN API INTEGRASJON
  // Konfigurer clientId og clientSecret når du mottar dem fra Forbrukerrådet
  // ═══════════════════════════════════════════════════════════════
  // ── FINANSPORTALEN via Netlify Function proxy (ingen CORS) ──────────
  async function fpGet(endpoint) {
    const resp = await fetch('/.netlify/functions/fp-proxy?endpoint=' + endpoint);
    if (!resp.ok) throw new Error('Proxy feil: ' + resp.status);
    return resp.json();
  }

  // ── HØYRENTEKONTO / BANK DEPOSITS ────────────────────────────────
  async function lastRenteFraFinansportalen() {
    const grid = document.getElementById('renteKortGrid');
    const label = document.getElementById('renteKildeLabel');
    if (!grid) return;

    if (!FP_CONFIG.clientId || FP_CONFIG.clientId.length < 10) {
      // Vis hardkodede fallback-data med tydelig merknad
      renderRenteKort(grid, RENTE_FALLBACK, false);
      if (label) label.textContent = 'Oppdatert mars 2026 · Koble til Finansportalen for live-data';
      return;
    }

    grid.innerHTML = '<div style="text-align:center;padding:30px;color:rgba(255,255,255,0.3);font-size:0.83rem;grid-column:1/-1"><div style="font-size:1.5rem;margin-bottom:8px">⏳</div>Henter live renter...</div>';
    try {
      const data = await fpGet('bank-deposits');
      // Filtrer på sparekonto/høyrentekonto, sorter på høyeste rente
      const sparekontoer = (data.products || data)
        .filter(p => p.depositAccounts?.some(a => a.interestRate > 0))
        .map(p => {
          const beste = p.depositAccounts.reduce((best, a) =>
            (a.interestRate > (best?.interestRate || 0)) ? a : best, null);
          return {
            bank:  p.provider?.name || p.bankName || 'Ukjent bank',
            rente: beste?.interestRate || 0,
            maks:  beste?.maximumDepositAmount,
            navn:  p.name || beste?.accountName || '',
            binding: beste?.noticePeriod || 0,
          };
        })
        .filter(p => p.rente > 0)
        .sort((a, b) => b.rente - a.rente)
        .slice(0, 6);

      renderRenteKort(grid, sparekontoer, true);
      if (label) label.textContent = 'Live data fra Finansportalen · ' + new Date().toLocaleDateString('no-NO');
    } catch (err) {
      console.error('Finansportalen rente feil:', err);
      renderRenteKort(grid, RENTE_FALLBACK, false);
      if (label) label.textContent = 'Kunne ikke hente live data — viser sist kjente';
    }
  }

  // Fallback-data (brukes til credentials er konfigurert)
  const RENTE_FALLBACK = [
    { bank:'Svea Sparebank', rente:4.85, maks:2000000, navn:'Høyrentekonto', binding:0 },
    { bank:'Bulder Bank',    rente:4.75, maks:2000000, navn:'Sparekonto',    binding:0 },
    { bank:'Sbanken (DNB)',  rente:4.50, maks:null,    navn:'Sparekonto',    binding:0 },
  ];

  function renderRenteKort(grid, data, erLive) {
    grid.innerHTML = data.map((p, i) => {
      const erBeste = i === 0;
      const renteStr = p.rente.toFixed(2).replace('.', ',') + '%';
      const maksStr  = p.maks ? 'Opp til ' + (p.maks/1000000).toFixed(0) + ' mill' : 'Ingen grense';
      const bindStr  = p.binding > 0 ? p.binding + ' dagers varsel' : 'Ingen binding';
      return `<div style="background:${erBeste?'rgba(182,240,96,0.05)':'rgba(255,255,255,0.02)'};border:1px solid ${erBeste?'rgba(182,240,96,0.25)':'rgba(255,255,255,0.08)'};border-radius:14px;padding:18px;text-align:center;transition:all 0.2s">
        <div style="font-size:0.73rem;color:rgba(255,255,255,0.45);font-weight:600;margin-bottom:8px">${p.bank}</div>
        <div style="font-family:'DM Serif Display',serif;font-size:2.2rem;color:#b6f060;line-height:1">${renteStr}</div>
        <div style="font-size:0.67rem;color:rgba(255,255,255,0.35);margin-top:3px">p.a. innskuddsrente</div>
        ${erBeste ? '<div style="display:inline-block;margin-top:10px;background:rgba(182,240,96,0.15);color:#b6f060;font-size:0.68rem;font-weight:700;padding:3px 10px;border-radius:100px">⭐ Beste rente</div>' : '<div style="display:inline-block;margin-top:10px;background:rgba(96,165,250,0.15);color:#60a5fa;font-size:0.68rem;font-weight:700;padding:3px 10px;border-radius:100px">Anbefalt</div>'}
        <div style="font-size:0.71rem;color:rgba(255,255,255,0.35);margin-top:8px">${bindStr} · ${maksStr}</div>
        ${erLive ? '' : '<div style="font-size:0.67rem;color:rgba(251,191,36,0.6);margin-top:5px">⚡ Ikke live</div>'}
      </div>`;
    }).join('');
  }

  // ── BOLIGLÅN / MORTGAGES ─────────────────────────────────────────
  async function lastLaanFraFinansportalen() {
    const grid  = document.getElementById('laanGrid');
    const label = document.getElementById('laanKildeLabel');
    if (!grid) return;

    if (!FP_CONFIG.clientId || FP_CONFIG.clientId.length < 10) {
      renderLaanKort(grid, LAAN_FALLBACK, false);
      if (label) label.textContent = 'Oppdatert mars 2026 · Koble til Finansportalen for live-data';
      return;
    }

    grid.innerHTML = '<div style="text-align:center;padding:30px;color:rgba(255,255,255,0.3);font-size:0.83rem;grid-column:1/-1"><div style="font-size:1.5rem;margin-bottom:8px">⏳</div>Henter live lånerenter...</div>';
    try {
      const lonn  = parseInt(document.getElementById('profLonnMnd')?.value) || 0;
      const laan  = typeof laanerListe !== 'undefined'
        ? laanerListe.reduce((s,l) => s + (parseInt(l.sum)||0), 0) : 0;
      // Bruk filtrert endepunkt med brukerens data
      const params = laan > 0
        ? `?loanAmount=${laan}&repaymentPeriod=25&propertyValue=${Math.round(laan*1.2)}`
        : '';
      const data = await fpGet('mortgages');
     const produkter = (Array.isArray(data) ? data : (data.products || []))
        .map(p => {
          const rente = p.product?.interestOnLoanData?.[0]?.nominalInterestRate || 0;
          return {
            bank:     p.companyName || 'Ukjent',
            rente:    rente,
            navn:     p.product?.name || p.name || 'Boliglån',
            krav:     p.isMembershipRequired ? 'Krever medlemskap' : 'Åpen for alle',
            nominell: rente,
          };
        })
        .filter(p => p.rente > 0)
        .sort((a, b) => a.rente - b.rente)
        .slice(0, 4);

      renderLaanKort(grid, produkter, true);
      if (label) label.textContent = 'Live data fra Finansportalen · ' + new Date().toLocaleDateString('no-NO');
    } catch (err) {
      console.error('Finansportalen lån feil:', err);
      renderLaanKort(grid, LAAN_FALLBACK, false);
      if (label) label.textContent = 'Kunne ikke hente live data — viser sist kjente';
    }
  }

  const LAAN_FALLBACK = [
    { bank:'Sbanken',           rente:5.09, nominell:4.98, navn:'Boliglån',        krav:'Åpen for alle' },
    { bank:'Bulder Bank',       rente:5.19, nominell:5.08, navn:'Boliglån',        krav:'Åpen for alle' },
    { bank:'Landkreditt Bank',  rente:5.24, nominell:5.12, navn:'Boliglån',        krav:'Krever medlemskap' },
    { bank:'Sparebanken Vest',  rente:5.39, nominell:5.27, navn:'Boliglån ung 34', krav:'Under 34 år' },
  ];

  function renderLaanKort(grid, data, erLive) {
    grid.innerHTML = data.map((p, i) => {
      const erBeste = i === 0;
      const effStr = p.rente.toFixed(2).replace('.', ',') + '%';
      const nomStr = p.nominell.toFixed(2).replace('.', ',') + '%';
      return `<div style="background:${erBeste?'rgba(251,191,36,0.05)':'rgba(255,255,255,0.02)'};border:1px solid ${erBeste?'rgba(251,191,36,0.25)':'rgba(255,255,255,0.08)'};border-radius:14px;padding:18px;transition:all 0.2s">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
          <div style="font-weight:700;font-size:0.88rem">${erBeste?'⭐ ':''}${p.bank}</div>
          ${erBeste ? '<span style="background:rgba(251,191,36,0.15);color:#fbbf24;font-size:0.68rem;font-weight:700;padding:2px 9px;border-radius:100px">Lavest rente</span>' : ''}
        </div>
        <div style="font-family:'DM Serif Display',serif;font-size:1.8rem;color:#fbbf24;line-height:1">${effStr}</div>
        <div style="font-size:0.68rem;color:rgba(255,255,255,0.35);margin-top:3px">eff. rente · Nominell: ${nomStr}</div>
        <div style="font-size:0.78rem;color:rgba(255,255,255,0.55);margin-top:8px">${p.navn}</div>
        <div style="font-size:0.72rem;color:rgba(255,255,255,0.35);margin-top:4px">${p.krav}</div>
        ${erLive ? '' : '<div style="font-size:0.67rem;color:rgba(251,191,36,0.6);margin-top:5px">⚡ Ikke live</div>'}
      </div>`;
    }).join('');
  }

  // ── AUTO-LAST VED OPPSTART ───────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      lastRenteFraFinansportalen();
      lastLaanFraFinansportalen();
    }, 500);
  });


  // ═══════════════════════════════════════════════════════════════
  // MODUL 1: BUNDLE-TIPS
  // ═══════════════════════════════════════════════════════════════
  const BUNDLE_DATABASER = [
    { id:'vg_podimo', sjekk:a=>a.some(x=>x.id==='vg')&&a.some(x=>x.id==='podimo'), ikon:'📰🎙️', tittel:'VG+ og Podimo', tekst:'<strong>VG+</strong>-abonnenter kan få <strong>Podimo</strong> inkludert. Sjekk om du betaler for begge separat.', spar:a=>a.find(x=>x.id==='podimo')?.pris, kilde:'vg.no' },
    { id:'tv2_disney', sjekk:a=>a.some(x=>x.id==='tv2_total')&&a.some(x=>x.id==='disney'), ikon:'📺🏰', tittel:'TV 2 Play og Disney+', tekst:'<strong>TV 2 Play Total</strong> inkluderer i perioder <strong>Disney+</strong>. Du betaler kanskje for begge unødvendig.', spar:a=>a.find(x=>x.id==='disney')?.pris, kilde:'tv2.no' },
    { id:'ice_netflix', sjekk:a=>{const m=window._mobilData;return m&&(m.operator==='ice'||m.operator==='ICE')&&a.some(x=>x.id==='netflix');}, ikon:'🧊📺', tittel:'ICE og Netflix', tekst:'<strong>ICE MAX</strong> (399 kr/mnd) inkluderer ubegrenset data <em>og</em> Netflix. Sannsynligvis billigere enn det du betaler nå.', spar:a=>{const mp=window._mobilData?.pris||0;const np=a.find(x=>x.id==='netflix')?.pris||0;return (mp+np)-399;}, kilde:'ice.no' },
    { id:'telenor_strom', sjekk:()=>{const m=window._mobilData;return m&&m.operator==='Telenor';}, ikon:'📱⚡', tittel:'Telenor-kunde? Sjekk Telenor Energi', tekst:'Som <strong>Telenor-mobilkunde</strong> kan du få rabatt på strøm via <strong>Telenor Energi</strong>. Kombinasjonsrabatt kan gi 50–100 kr/mnd.', spar:()=>75, kilde:'telenor.no' },
    { id:'nordnet', sjekk:()=>{const l=parseInt(document.getElementById('profLonnMnd')?.value)||0;return l>0;}, ikon:'🏦📈', tittel:'Nordnet — månedlig fondssparing', tekst:'<strong>Nordnet</strong> lar deg spare i indeksfond fra 100 kr/mnd uten kurtasje. Globalt indeksfond med 0,2% kostnad er et godt startpunkt.', spar:()=>null, kilde:'nordnet.no' },
    { id:'obos', sjekk:a=>a.length>0, ikon:'🏘️', tittel:'OBOS-fordeler', tekst:'OBOS-medlemmer får rabatt på strøm (Tibber), forsikring og mer. Medlemskap 500 kr — betaler seg raskt.', spar:()=>null, kilde:'obos.no' },
  ];

  function genererBundleTips() {
    const el = document.getElementById('bundleTipsListe');
    if (!el) return;
    const tips = BUNDLE_DATABASER.filter(b => { try { return b.sjekk(mineAbonnement); } catch(e) { return false; } });
    if (!tips.length) { el.innerHTML = ''; return; }
    el.innerHTML = '<div style="font-size:0.72rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin:16px 0 10px">🤝 Partnertilbud & bundles</div>' +
      tips.map(t => {
        let spar=null; try { spar=t.spar(mineAbonnement); } catch(e) {}
        return `<div class="bundle-tip-kort"><div class="bundle-tip-ikon">${t.ikon}</div><div class="bundle-tip-tekst"><strong>${t.tittel}</strong><br/>${t.tekst}${spar&&spar>0?`<div class="bundle-tip-spar">Potensiell besparelse: ~${spar} kr/mnd</div>`:''}<div class="bundle-tip-kilde">Kilde: ${t.kilde}</div></div></div>`;
      }).join('');
  }

  // ═══════════════════════════════════════════════════════════════
  // MODUL 2: SPARERÅDGIVER
  // ═══════════════════════════════════════════════════════════════
  function oppdaterSparerad() {
    const lonn    = parseInt(document.getElementById('profLonnMnd')?.value) || 0;
    const husleie = parseInt(document.getElementById('profHusleie')?.value) || 0;
    const laanMnd = (typeof laanerListe!=='undefined') ? laanerListe.reduce((s,l)=>s+(parseInt(l.mnd)||0),0) : 0;
    const faste   = Math.round((kostnadStrom||0)+(kostnadMobil||0)+(kostnadBredband||0)+(kostnadForsikring||0));
    const fritid  = kostnadAbonnement||0;
    const boligOgLaan = husleie+laanMnd;
    const totUtgift   = boligOgLaan+faste+fritid;
    const igjen       = lonn-totUtgift;

    const bufferMal = document.getElementById('bufferMal');
    if (bufferMal && lonn>0) {
      bufferMal.innerHTML = `<div style="font-size:0.82rem;color:var(--lime);font-weight:600">Ditt buffer-mål: ${(lonn*3).toLocaleString('no-NO')} kr</div><div style="font-size:0.76rem;color:var(--muted)">Plasser i høyrentekonto, ikke BSU.</div>`;
    }
    if (!lonn) return;

    const pDiv = document.getElementById('spareradPersonlig');
    const pRader = document.getElementById('spareradPersonligRader');
    if (pDiv && pRader) {
      pDiv.style.display='block';
      const p50=Math.round(lonn*0.5), p30=Math.round(lonn*0.3), p20=Math.round(lonn*0.2);
      const KORT = (lbl,anbefalt,brukt,ok) => `<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:18px;text-align:center;position:relative;overflow:hidden"><div style="position:absolute;top:0;left:0;right:0;height:3px;background:${ok?'#b6f060':'#f87171'}"></div><div style="font-size:0.67rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-bottom:8px">${lbl}</div><div style="font-family:'DM Serif Display',serif;font-size:1.7rem;color:${ok?'#b6f060':'#f87171'};line-height:1">${anbefalt.toLocaleString('no-NO')} kr</div><div style="font-size:0.73rem;color:rgba(255,255,255,0.4);margin-top:5px">Du bruker: ${brukt.toLocaleString('no-NO')} kr</div></div>`;
      pRader.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:4px">
        ${KORT('50% Nødvendig', p50, boligOgLaan+faste, (boligOgLaan+faste)<=p50)}
        ${KORT('30% Fritid', p30, fritid, fritid<=p30)}
        ${KORT('20% Sparing', p20, Math.max(0,igjen), igjen>=p20)}
      </div>`;
    }

    const rtEl = document.getElementById('restpengeTips');
    if (!rtEl) return;
    const TIPSBLOKK = (farge,ikon,tittel,tekst) => `<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(${farge},0.2);border-radius:14px;padding:20px;position:relative;overflow:hidden;display:flex;gap:14px;align-items:flex-start"><div style="position:absolute;top:0;left:0;right:0;height:3px;background:rgba(${farge},0.7)"></div><div style="font-size:1.5rem;flex-shrink:0;margin-top:2px">${ikon}</div><div><div style="font-weight:700;font-size:0.93rem;margin-bottom:6px">${tittel}</div><div style="font-size:0.83rem;color:rgba(255,255,255,0.55);line-height:1.65">${tekst}</div></div></div>`;
    let tips = '';
    if (igjen<=0) {
      tips = TIPSBLOKK('248,113,113','🚨','Du går i minus!',`Utgiftene overstiger inntekten med <strong style="color:#f87171">${Math.abs(igjen).toLocaleString('no-NO')} kr/mnd</strong>. Se på abonnementer og fritidsutgifter som kan kuttes.`);
    } else if (igjen < lonn*0.1) {
      tips = TIPSBLOKK('251,191,36','⚠️',`Lite å spare — ${igjen.toLocaleString('no-NO')} kr/mnd`,`Under 10% til sparing. Prioriter buffer på <strong style="color:#fbbf24">${(lonn*3).toLocaleString('no-NO')} kr</strong> i høyrentekonto.`);
    } else {
      const sparMnd = Math.round(igjen*0.5);
      const fond10 = Math.round(sparMnd*12*((Math.pow(1.07,10)-1)/0.07));
      tips = TIPSBLOKK('182,240,96','💚',`Du har ${igjen.toLocaleString('no-NO')} kr/mnd til rådighet`,`Anbefalt: sett <strong style="color:#b6f060">${sparMnd.toLocaleString('no-NO')} kr/mnd</strong> i indeksfond (Nordnet/KLP). Med 7% snittavkastning gir det ca <strong style="color:#b6f060">${fond10.toLocaleString('no-NO')} kr på 10 år</strong>.`);
    }
    rtEl.innerHTML = tips;
    oppdaterBudsjettPreview(lonn, boligOgLaan, faste, fritid, igjen);
  }

  function oppdaterBudsjettPreview(lonn, bolig, faste, fritid, igjen) {
    const el = document.getElementById('budsjettPreview');
    if (!el||!lonn) return;
    const rader = [
      {lbl:'💰 Månedlig netto inntekt',val:lonn,type:'inntekt'},
      {lbl:'🏠 Bolig / lån',val:-bolig,type:'utgift'},
      {lbl:'⚡ Faste avtaler (strøm/mobil/osv.)',val:-Math.round(faste),type:'utgift'},
      {lbl:'🎬 Fritid & abonnementer',val:-Math.round(fritid),type:'utgift'},
      {lbl:'💚 Disponibelt til sparing',val:igjen,type:'sum'},
    ];
    el.innerHTML = rader.map(r=>`<div class="budsjett-rad ${r.type} ${r.val<0?'negativ':''}"><span class="budsjett-lbl">${r.lbl}</span><span class="budsjett-val">${r.val>=0?'+':''}${r.val.toLocaleString('no-NO')} kr</span></div>`).join('');
  }

  // ═══════════════════════════════════════════════════════════════
  // MODUL 3B: EXCEL BUDSJETT
  // ═══════════════════════════════════════════════════════════════
  async function lastNedBudsjett() {
    if (typeof XLSX==='undefined') { alert('Laster... prøv igjen.'); return; }
    const lonn=parseInt(document.getElementById('profLonnMnd')?.value)||0;
    const husleie=parseInt(document.getElementById('profHusleie')?.value)||0;
    const laanMnd=(typeof laanerListe!=='undefined')?laanerListe.reduce((s,l)=>s+(parseInt(l.mnd)||0),0):0;
    const strom=Math.round(kostnadStrom||0),mobil=Math.round(kostnadMobil||0),bredband=Math.round(kostnadBredband||0),forsikr=Math.round(kostnadForsikring||0),abb=Math.round(kostnadAbonnement||0);
    const wb = XLSX.utils.book_new();
    const budsjett = [
      ['BYTTEHJELPERN — MÅNEDLIG BUDSJETT','',''],['Generert: '+new Date().toLocaleDateString('no-NO'),'',''],['','',''],
      ['POST','Beløp (kr)','Budsjett (kr)'],['Månedlig nettoinntekt',lonn,lonn],['','',''],
      ['NØDVENDIGE UTGIFTER','',''],['Bolig/husleie',husleie,husleie],['Lån terminbeløp',laanMnd,laanMnd],
      ['Strøm',strom,strom],['Mobil',mobil,mobil],['Bredbånd',bredband,bredband],['Forsikring',forsikr,forsikr],
      ['Sum nødvendige','=SUM(B8:B13)','=SUM(C8:C13)'],['','',''],
      ['FRITID','',''],['Abonnementer',abb,abb],['Mat/dagligvare','',''],['Transport','',''],['Trening','',''],['Annet','',''],
      ['Sum fritid','=SUM(B16:B20)','=SUM(C16:C20)'],['','',''],
      ['OPPSUMMERING','',''],['Totale utgifter','=B14+B21','=C14+C21'],['DISPONIBELT','=B5-B24','=C5-C24'],['','',''],
      ['SPARING','',''],['Buffer','',''],['BSU (maks 2 292 kr/mnd)','',''],['Indeksfond','',''],['Sum sparing','=SUM(B27:B29)','=SUM(C27:C29)'],
    ];
    const abbRader = [['ABONNEMENTER','Pris/mnd','Trekkdag'],...mineAbonnement.map(a=>[a.navn,a.pris,a.trekkdag||'']),['','',''],['TOTAL','=SUM(B2:B'+(1+mineAbonnement.length)+')','']];
    const ws1=XLSX.utils.aoa_to_sheet(budsjett), ws2=XLSX.utils.aoa_to_sheet(abbRader);
    ws1['!cols']=[{wch:32},{wch:16},{wch:16}]; ws2['!cols']=[{wch:28},{wch:12},{wch:12}];
    XLSX.utils.book_append_sheet(wb,ws1,'Budsjett');
    XLSX.utils.book_append_sheet(wb,ws2,'Abonnementer');
    XLSX.writeFile(wb,'byttehjelpern-budsjett-'+new Date().getFullYear()+'.xlsx');
  }

  // ═══════════════════════════════════════════════════════════════
  // MODUL 4: PRISHISTORIKK
  // ═══════════════════════════════════════════════════════════════
  const PRIS_DATA = {
    strom: [
      {navn:'Tibber',badge:'billig',anbefalt:true,aktuell:'Spotpris + 39 øre/mnd fast',trend:'↗ Forventet høyere vinter 2026',kampanje:null,historikk:[{mnd:'Nov 2025',snittpris:'88 øre/kWh'},{mnd:'Des 2025',snittpris:'95 øre/kWh'},{mnd:'Jan 2026',snittpris:'102 øre/kWh'},{mnd:'Feb 2026',snittpris:'78 øre/kWh'}]},
      {navn:'Fjordkraft',badge:'ok',anbefalt:false,aktuell:'Spotpris + 4,90 øre/kWh + 39 kr/mnd',trend:'→ Stabil prising',kampanje:{tekst:'Ny kunde? 0 kr påslag de første 3 månedene',utloper:'31. mars 2026'},historikk:[{mnd:'Nov 2025',snittpris:'91 øre/kWh'},{mnd:'Des 2025',snittpris:'98 øre/kWh'},{mnd:'Jan 2026',snittpris:'106 øre/kWh'},{mnd:'Feb 2026',snittpris:'81 øre/kWh'}]},
      {navn:'Agva Kraft',badge:'billig',anbefalt:false,aktuell:'Spotpris + 0 øre/kWh + 19 kr/mnd',trend:'↘ Laveste påslag nå',kampanje:{tekst:'Gratis bytte + gratis første mnd',utloper:'30. april 2026'},historikk:[{mnd:'Nov 2025',snittpris:'87 øre/kWh'},{mnd:'Des 2025',snittpris:'93 øre/kWh'},{mnd:'Jan 2026',snittpris:'100 øre/kWh'},{mnd:'Feb 2026',snittpris:'76 øre/kWh'}]},
      {navn:'Fortum',badge:'ok',anbefalt:false,aktuell:'Spotpris + 3,9 øre/kWh + 49 kr/mnd',trend:'→ Stabil',kampanje:null,historikk:[{mnd:'Nov 2025',snittpris:'90 øre/kWh'},{mnd:'Des 2025',snittpris:'97 øre/kWh'},{mnd:'Jan 2026',snittpris:'105 øre/kWh'},{mnd:'Feb 2026',snittpris:'80 øre/kWh'}]},
    ],
    mobil: [
      {navn:'Talkmore',badge:'billig',anbefalt:true,aktuell:'Ubegrenset fra 299 kr/mnd',trend:'↘ Prisene presses ned',kampanje:{tekst:'3 måneder halv pris',utloper:'15. april 2026'},historikk:[]},
      {navn:'ice',badge:'billig',anbefalt:false,aktuell:'ICE MAX (ubegr. + Netflix) 399 kr/mnd',trend:'→ Stabil',kampanje:{tekst:'ICE MAX inkl. Netflix — ingen binding',utloper:'Løpende'},historikk:[]},
      {navn:'Telenor',badge:'ok',anbefalt:false,aktuell:'Ubegrenset fra 499 kr/mnd',trend:'→ Premium-prising',kampanje:null,historikk:[]},
      {navn:'OneCall',badge:'billig',anbefalt:false,aktuell:'10 GB fra 199 kr/mnd',trend:'↘ Lavpris',kampanje:{tekst:'Gratis SIM + ingen oppkoblingsgebyr',utloper:'30. april 2026'},historikk:[]},
    ],
    bredband: [
      {navn:'Altibox',badge:'ok',anbefalt:false,aktuell:'250 Mbit/s fra 449 kr/mnd',trend:'→ Stabil',kampanje:null,historikk:[]},
      {navn:'Telenor Fiber',badge:'ok',anbefalt:false,aktuell:'500 Mbit/s fra 499 kr/mnd',trend:'→ Stabil',kampanje:{tekst:'3 måneder gratis for nye kunder',utloper:'30. april 2026'},historikk:[]},
      {navn:'Ice Fiber',badge:'billig',anbefalt:false,aktuell:'250 Mbit/s fra 349 kr/mnd',trend:'↘ Ny aktør presser priser',kampanje:{tekst:'Halv pris de 6 første månedene',utloper:'Løpende'},historikk:[]},
    ]
  };

  function renderPrishistorikk() {
    const BADGE = b => b==='billig'?'<span style="background:rgba(182,240,96,0.12);color:#b6f060;font-size:0.69rem;font-weight:700;padding:2px 9px;border-radius:100px">✓ Billig</span>':b==='dyr'?'<span style="background:rgba(248,113,113,0.12);color:#f87171;font-size:0.69rem;font-weight:700;padding:2px 9px;border-radius:100px">✗ Dyrt</span>':'<span style="background:rgba(251,191,36,0.12);color:#fbbf24;font-size:0.69rem;font-weight:700;padding:2px 9px;border-radius:100px">≈ Greit</span>';
    function lagGrid(gridId, data) {
      const el=document.getElementById(gridId);
      if (!el) return;
      el.innerHTML = data.map(d=>`
        <div style="background:#0d1f15;border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:18px;transition:border-color 0.2s">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
            <div style="font-weight:700;font-size:0.93rem">${d.anbefalt?'⭐ ':''}${d.navn}</div>
            ${BADGE(d.badge)}
          </div>
          <div style="font-size:0.82rem;color:rgba(255,255,255,0.8);margin-bottom:6px">${d.aktuell}</div>
          <div style="font-size:0.76rem;color:rgba(255,255,255,0.4);margin-bottom:10px">${d.trend}</div>
          ${d.kampanje?`<div style="background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.2);border-radius:8px;padding:10px 12px;margin-bottom:10px"><div style="font-size:0.78rem;line-height:1.55"><strong style="color:#a78bfa">🏷️ Kampanje:</strong> ${d.kampanje.tekst}</div><div style="font-size:0.71rem;color:rgba(255,255,255,0.35);margin-top:4px">Utløper: ${d.kampanje.utloper}</div></div>`:''}
          ${d.historikk?.length?`<div style="border-top:1px solid rgba(255,255,255,0.06);padding-top:10px;margin-top:4px">${d.historikk.map(h=>`<div style="display:flex;justify-content:space-between;font-size:0.77rem;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.04);color:rgba(255,255,255,0.45)"><span>${h.mnd}</span><span style="font-weight:600;color:rgba(255,255,255,0.7)">${h.snittpris}</span></div>`).join('')}</div>`:''}
        </div>`).join('');
    }
    lagGrid('prisStromGrid', PRIS_DATA.strom);
    lagGrid('prisMobilGrid', PRIS_DATA.mobil);
    lagGrid('prisBredbandGrid', PRIS_DATA.bredband);
  }

  // ═══════════════════════════════════════════════════════════════
  // MODUL 5: SPART OVERSIKT
  // ═══════════════════════════════════════════════════════════════
  function oppdaterSpartOversikt() {
    let total=0; const posts=[];
    if (kostnadStrom>0)         { total+=258; posts.push({lbl:'⚡ Strøm',beløp:258}); }
    if (kostnadMobil>0)         { total+=100; posts.push({lbl:'📱 Mobil',beløp:100}); }
    if (mineAbonnement.length>0){ total+=150; posts.push({lbl:'🎬 Abonnementer',beløp:150}); }
    if (!total) return;
    const el=document.getElementById('spartOversikt');
    if (el) el.style.display='block';
    const tEl=document.getElementById('spartTotalt');
    if (tEl) tEl.textContent=(total*12).toLocaleString('no-NO')+' kr';
    const bdEl=document.getElementById('spartBreakdown');
    if (bdEl) bdEl.innerHTML=posts.map(p=>`<div style="background:rgba(182,240,96,0.06);border:1px solid rgba(182,240,96,0.12);border-radius:12px;padding:14px 12px;text-align:center"><div style="font-weight:700;font-size:1.1rem;color:#b6f060">${(p.beløp*12).toLocaleString('no-NO')} kr</div><div style="font-size:0.72rem;color:rgba(255,255,255,0.45);margin-top:4px">${p.lbl}/år</div></div>`).join('');
  }

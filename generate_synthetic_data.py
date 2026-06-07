import numpy as np
import pandas as pd
from scipy.special import expit


def generate_synthetic_data():
    rng = np.random.default_rng(seed=42)

    N_TRAIN = 50_000
    N_SCORE = 5_000
    N = N_TRAIN + N_SCORE

    # ── Cancer type ──────────────────────────────────────────────────────────
    cancer_type = rng.choice(
        ['breast', 'colorectal', 'prostate', 'oral_head_neck'],
        size=N, p=[0.35, 0.25, 0.20, 0.20]
    )
    breast_mask = cancer_type == 'breast'
    colorectal_mask = cancer_type == 'colorectal'
    prostate_mask = cancer_type == 'prostate'
    ohn_mask = cancer_type == 'oral_head_neck'

    # ── Patient IDs (vectorised string ops) ─────────────────────────────────
    patient_ids = np.char.add(
        'PAT-', np.char.zfill(np.arange(1, N + 1).astype(str), 6)
    )

    # ── Age (cancer-type-dependent normals, clipped to 20-85) ───────────────
    age = np.empty(N, dtype=int)
    age[breast_mask]     = np.clip(rng.normal(55, 10, breast_mask.sum()),     20, 85).astype(int)
    age[prostate_mask]   = np.clip(rng.normal(68,  8, prostate_mask.sum()),   20, 85).astype(int)
    age[colorectal_mask] = np.clip(rng.normal(60, 15, colorectal_mask.sum()), 20, 85).astype(int)
    age[ohn_mask]        = np.clip(rng.normal(55, 15, ohn_mask.sum()),        20, 85).astype(int)

    # ── Gender ──────────────────────────────────────────────────────────────
    gender = np.empty(N, dtype=object)
    gender[prostate_mask]   = 'male'
    gender[breast_mask]     = rng.choice(
        ['female', 'male', 'other'], size=breast_mask.sum(),     p=[0.95, 0.04, 0.01]
    )
    gender[colorectal_mask] = rng.choice(
        ['male', 'female', 'other'], size=colorectal_mask.sum(), p=[0.52, 0.46, 0.02]
    )
    gender[ohn_mask]        = rng.choice(
        ['male', 'female', 'other'], size=ohn_mask.sum(),        p=[0.60, 0.38, 0.02]
    )

    # ── Nationality / Language ───────────────────────────────────────────────
    nationality_region = rng.choice(
        ['Western Europe', 'Eastern Europe', 'South Asia', 'Southeast Asia',
         'Middle East', 'Africa', 'Americas'],
        size=N, p=[0.18, 0.10, 0.20, 0.15, 0.17, 0.10, 0.10]
    )
    preferred_language = rng.choice(
        ['English', 'Arabic', 'Hindi', 'Tagalog', 'French', 'Spanish', 'Other'],
        size=N, p=[0.35, 0.15, 0.15, 0.10, 0.10, 0.10, 0.05]
    )

    # ── Distance (log-normal, clipped 1-200 km) ──────────────────────────────
    distance_from_hospital_km = np.clip(
        rng.lognormal(mean=3.0, sigma=1.0, size=N), 1, 200
    ).round(1)

    # ── Insurance ───────────────────────────────────────────────────────────
    insurance_type = rng.choice(
        ['private_international', 'private_local', 'corporate', 'self_pay', 'government'],
        size=N, p=[0.15, 0.25, 0.20, 0.15, 0.25]
    )
    has_active_insurance_authorisation = rng.binomial(1, 0.70, N)

    # right-skewed balance, range 0-5000
    outstanding_balance_usd = np.clip(rng.exponential(scale=500, size=N), 0, 5000).round(2)

    # ── Clinical context ─────────────────────────────────────────────────────
    cancer_stage = rng.choice(['I', 'II', 'III', 'IV'], size=N, p=[0.25, 0.30, 0.25, 0.20])

    treatment_phase = rng.choice(
        ['diagnosis', 'surgery', 'adjuvant_chemotherapy', 'adjuvant_radiation',
         'hormone_therapy', 'surveillance', 'palliative'],
        size=N, p=[0.15, 0.15, 0.20, 0.15, 0.15, 0.15, 0.05]
    )

    pathway_step = rng.choice(
        ['initial_consultation', 'imaging', 'biopsy', 'mdt_review', 'surgery',
         'chemotherapy_cycle', 'radiation_session', 'follow_up_scan',
         'genetic_counselling', 'survivorship_review'],
        size=N, p=[0.12, 0.12, 0.10, 0.10, 0.10, 0.12, 0.12, 0.12, 0.05, 0.05]
    )

    days_since_diagnosis            = rng.integers(0, 1801, size=N)
    days_since_last_clinical_contact = rng.integers(0, 366,  size=N)

    biomarker_status = rng.choice(
        ['positive', 'negative', 'unknown', 'not_applicable'],
        size=N, p=[0.30, 0.35, 0.15, 0.20]
    )

    ecog_performance_status = rng.choice(
        [0, 1, 2, 3, 4], size=N, p=[0.30, 0.30, 0.20, 0.12, 0.08]
    )
    comorbidity_count = rng.integers(0, 7, size=N)

    referring_clinician_specialty = rng.choice(
        ['oncology', 'surgery', 'radiology', 'gp', 'palliative_care', 'other'],
        size=N, p=[0.35, 0.20, 0.15, 0.20, 0.05, 0.05]
    )

    # ── Appointment behaviour ────────────────────────────────────────────────
    booking_lead_time_days      = rng.integers(0, 61, size=N)
    previous_noshow_count       = rng.integers(0, 11, size=N)
    previous_cancellation_count = rng.integers(0, 9,  size=N)
    previous_reschedule_count   = rng.integers(0, 9,  size=N)

    # inversely correlated with noshow count
    historical_attendance_rate = np.clip(
        rng.uniform(0.5, 1.0, size=N) - previous_noshow_count * 0.07, 0.0, 1.0
    ).round(3)

    days_since_last_appointment = rng.integers(0, 181, size=N)
    appointment_type = rng.choice(['in_person', 'telehealth'], size=N, p=[0.75, 0.25])
    appointment_day_of_week = rng.choice(
        ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        size=N, p=[0.20, 0.20, 0.20, 0.20, 0.15, 0.03, 0.02]
    )
    appointment_time_slot = rng.choice(
        ['morning', 'afternoon', 'evening'], size=N, p=[0.45, 0.40, 0.15]
    )

    # ── Engagement signals ───────────────────────────────────────────────────
    portal_logins_last_30_days = rng.integers(0, 21, size=N)

    sms_reminder_sent      = rng.binomial(1, 0.70, N)
    sms_reminder_responded = rng.binomial(1, 0.55, N) * sms_reminder_sent

    whatsapp_message_sent      = rng.binomial(1, 0.55, N)
    whatsapp_message_responded = rng.binomial(1, 0.50, N) * whatsapp_message_sent

    outbound_call_attempts          = rng.integers(0, 6, size=N)
    call_answered                   = rng.binomial(1, 0.45, N)
    care_coordinator_assigned       = rng.binomial(1, 0.40, N)
    patient_education_material_sent = rng.binomial(1, 0.60, N)
    days_since_last_portal_login    = rng.integers(0, 91, size=N)

    # ── Intervention history ─────────────────────────────────────────────────
    previous_leakage_flag = rng.binomial(1, 0.25, N)

    _int_types = ['none', 'sms', 'call', 'whatsapp', 'coordinator', 'telehealth_offer']
    prev_int_no_leak = rng.choice(_int_types, size=N, p=[0.50, 0.15, 0.15, 0.10, 0.05, 0.05])
    prev_int_leak    = rng.choice(_int_types, size=N, p=[0.10, 0.20, 0.25, 0.20, 0.15, 0.10])
    previous_intervention_type = np.where(
        previous_leakage_flag == 1, prev_int_leak, prev_int_no_leak
    )

    _int_outcomes = ['not_applicable', 'attended', 'no_show', 'cancelled', 'rescheduled']
    prev_out_base = rng.choice(_int_outcomes, size=N, p=[0.50, 0.25, 0.10, 0.08, 0.07])
    prev_out_leak  = rng.choice(_int_outcomes, size=N, p=[0.05, 0.30, 0.30, 0.20, 0.15])
    prev_outcome_raw = np.where(previous_leakage_flag == 1, prev_out_leak, prev_out_base)
    # outcome must be not_applicable when no intervention was performed
    previous_intervention_outcome = np.where(
        previous_intervention_type == 'none', 'not_applicable', prev_outcome_raw
    )

    # ── Leakage probability via additive log-odds ────────────────────────────
    log_odds = np.full(N, np.log(0.36 / 0.64))           # base ≈ -0.575

    log_odds += np.where(distance_from_hospital_km > 30, 0.80, 0.0)          # strong +
    log_odds += np.where(has_active_insurance_authorisation == 0, 0.90, 0.0)  # strong +
    log_odds += previous_noshow_count * 0.35                                   # strongest predictor
    log_odds += np.where(
        (portal_logins_last_30_days <= 2) & (call_answered == 0), 0.70, 0.0   # combined risk
    )
    log_odds += np.where(
        (cancer_stage == 'IV') & (ecog_performance_status >= 3), 0.60, 0.0    # elevated
    )
    log_odds += np.where(booking_lead_time_days > 21, 0.40, 0.0)              # moderate +
    log_odds += np.where(outstanding_balance_usd > 500, 0.40, 0.0)            # moderate +
    log_odds += np.where(biomarker_status == 'unknown', 0.30, 0.0)            # moderate +
    log_odds += np.where(cancer_type == 'oral_head_neck', 0.30, 0.0)          # higher base
    log_odds -= historical_attendance_rate * 1.50                              # protective
    log_odds += np.where(care_coordinator_assigned == 1, -0.50, 0.0)          # protective
    log_odds += np.where(previous_leakage_flag == 1, 0.60, 0.0)               # recurrence risk

    leakage_prob = expit(log_odds)

    # Calibrate threshold on training rows to achieve exactly 36% positive rate
    n_pos_target = round(0.36 * N_TRAIN)                          # 18 000
    train_probs  = leakage_prob[:N_TRAIN]
    threshold    = np.partition(train_probs, N_TRAIN - n_pos_target)[N_TRAIN - n_pos_target]
    missed_pathway_milestone = (leakage_prob >= threshold).astype(int)

    # ── Assemble DataFrame ───────────────────────────────────────────────────
    df = pd.DataFrame({
        'patient_id':                        patient_ids,
        'age':                               age,
        'gender':                            gender,
        'nationality_region':                nationality_region,
        'preferred_language':                preferred_language,
        'distance_from_hospital_km':         distance_from_hospital_km,
        'insurance_type':                    insurance_type,
        'has_active_insurance_authorisation': has_active_insurance_authorisation,
        'outstanding_balance_usd':           outstanding_balance_usd,
        'cancer_type':                       cancer_type,
        'cancer_stage':                      cancer_stage,
        'treatment_phase':                   treatment_phase,
        'pathway_step':                      pathway_step,
        'days_since_diagnosis':              days_since_diagnosis,
        'days_since_last_clinical_contact':  days_since_last_clinical_contact,
        'biomarker_status':                  biomarker_status,
        'ecog_performance_status':           ecog_performance_status,
        'comorbidity_count':                 comorbidity_count,
        'referring_clinician_specialty':     referring_clinician_specialty,
        'booking_lead_time_days':            booking_lead_time_days,
        'previous_noshow_count':             previous_noshow_count,
        'previous_cancellation_count':       previous_cancellation_count,
        'previous_reschedule_count':         previous_reschedule_count,
        'historical_attendance_rate':        historical_attendance_rate,
        'days_since_last_appointment':       days_since_last_appointment,
        'appointment_type':                  appointment_type,
        'appointment_day_of_week':           appointment_day_of_week,
        'appointment_time_slot':             appointment_time_slot,
        'portal_logins_last_30_days':        portal_logins_last_30_days,
        'sms_reminder_sent':                 sms_reminder_sent,
        'sms_reminder_responded':            sms_reminder_responded,
        'whatsapp_message_sent':             whatsapp_message_sent,
        'whatsapp_message_responded':        whatsapp_message_responded,
        'outbound_call_attempts':            outbound_call_attempts,
        'call_answered':                     call_answered,
        'care_coordinator_assigned':         care_coordinator_assigned,
        'patient_education_material_sent':   patient_education_material_sent,
        'days_since_last_portal_login':      days_since_last_portal_login,
        'previous_leakage_flag':             previous_leakage_flag,
        'previous_intervention_type':        previous_intervention_type,
        'previous_intervention_outcome':     previous_intervention_outcome,
        'missed_pathway_milestone':          missed_pathway_milestone,
    })

    # ── Change 2: Contradictions and noise (~8% of rows) ─────────────────────
    n_contra  = round(0.08 * N)
    contra_idx = rng.choice(N, size=n_contra, replace=False)
    ctypes     = (np.arange(n_contra) % 5) + 1   # cycles 1-2-3-4-5-1-2-...

    c1 = contra_idx[ctypes == 1]
    c2 = contra_idx[ctypes == 2]
    c3 = contra_idx[ctypes == 3]
    c4 = contra_idx[ctypes == 4]
    c5 = contra_idx[ctypes == 5]

    # Type 1: digitally engaged but physically non-attending
    df.loc[c1, 'previous_noshow_count']      = rng.integers(6, 11, size=len(c1))
    df.loc[c1, 'portal_logins_last_30_days'] = rng.integers(11, 21, size=len(c1))

    # Type 2: late stage but high functioning
    df.loc[c2, 'cancer_stage']            = 'IV'
    df.loc[c2, 'ecog_performance_status'] = 0

    # Type 3: distant but fully covered
    df.loc[c3, 'distance_from_hospital_km']         = np.round(rng.uniform(51, 180, len(c3)), 1)
    df.loc[c3, 'has_active_insurance_authorisation'] = 1
    df.loc[c3, 'outstanding_balance_usd']            = np.round(rng.uniform(0, 100, len(c3)), 2)

    # Type 4: zero noshows but low historical attendance rate
    df.loc[c4, 'previous_noshow_count']      = 0
    df.loc[c4, 'historical_attendance_rate'] = np.round(rng.uniform(0.3, 0.59, len(c4)), 3)

    # Type 5: coordinator auto-assigned but no contact attempted
    df.loc[c5, 'care_coordinator_assigned'] = 1
    df.loc[c5, 'outbound_call_attempts']    = 0

    contra_labels = {
        1: ('High noshow + high portal logins',   len(c1)),
        2: ('Stage IV + ECOG 0',                  len(c2)),
        3: ('Distant + fully covered',             len(c3)),
        4: ('Zero noshows + low attendance rate',  len(c4)),
        5: ('Coordinator assigned + no calls',     len(c5)),
    }

    # ── Change 1: Structured missingness (applied to full dataset) ────────────
    # ecog_performance_status: ~18%, higher rate for stage I/II
    stage_early  = df['cancer_stage'].isin(['I', 'II']).values
    ecog_p       = np.where(stage_early, 0.24, 0.11)
    ecog_miss    = rng.random(N) < ecog_p
    df['ecog_performance_status'] = df['ecog_performance_status'].astype(float)
    df.loc[ecog_miss, 'ecog_performance_status'] = np.nan

    # biomarker_status: ~12%, higher for colorectal/prostate
    bio_high     = df['cancer_type'].isin(['colorectal', 'prostate']).values
    bio_p        = np.where(bio_high, 0.20, 0.058)
    bio_miss     = rng.random(N) < bio_p
    df.loc[bio_miss, 'biomarker_status'] = np.nan

    # referring_clinician_specialty: ~12%, higher for self_pay/government
    ref_high     = df['insurance_type'].isin(['self_pay', 'government']).values
    ref_p        = np.where(ref_high, 0.20, 0.073)
    ref_miss     = rng.random(N) < ref_p
    df.loc[ref_miss, 'referring_clinician_specialty'] = np.nan

    # days_since_last_clinical_contact: ~8%, higher for surveillance phase
    surv_high    = (df['treatment_phase'] == 'surveillance').values
    clinical_p   = np.where(surv_high, 0.18, 0.063)
    clinical_miss = rng.random(N) < clinical_p
    df['days_since_last_clinical_contact'] = df['days_since_last_clinical_contact'].astype(float)
    df.loc[clinical_miss, 'days_since_last_clinical_contact'] = np.nan

    # outstanding_balance_usd: ~6%, higher for government insurance
    gov_high     = (df['insurance_type'] == 'government').values
    balance_p    = np.where(gov_high, 0.14, 0.033)
    balance_miss = rng.random(N) < balance_p
    df.loc[balance_miss, 'outstanding_balance_usd'] = np.nan

    miss_cols = [
        'ecog_performance_status', 'biomarker_status',
        'referring_clinician_specialty', 'days_since_last_clinical_contact',
        'outstanding_balance_usd',
    ]

    # ── Split ─────────────────────────────────────────────────────────────────
    train_df = df.iloc[:N_TRAIN].copy()
    score_df = df.iloc[N_TRAIN:].copy().drop(columns=['missed_pathway_milestone'])
    score_df = score_df.reset_index(drop=True)

    # ── Change 3: Temporal drift (scoring data only) ──────────────────────────
    # a) Distance: multiply by 1.15 for 30% of score rows
    dist_vals = score_df['distance_from_hospital_km'].values.copy()
    dist_shift = rng.random(N_SCORE) < 0.30
    dist_vals[dist_shift] = np.clip(np.round(dist_vals[dist_shift] * 1.15, 1), 1, 200)
    score_df['distance_from_hospital_km'] = dist_vals

    # b) Insurance: 8% of corporate rows converted to self_pay
    ins_vals = score_df['insurance_type'].values.copy()
    corp_pos = np.where(ins_vals == 'corporate')[0]
    n_convert = round(0.08 * len(corp_pos))
    if n_convert > 0:
        chosen = rng.choice(corp_pos, size=n_convert, replace=False)
        ins_vals[chosen] = 'self_pay'
    score_df['insurance_type'] = ins_vals

    # c) Booking lead time: +3-7 days for 25% of score rows, capped at 60
    lead_vals  = score_df['booking_lead_time_days'].values.copy()
    lead_shift = rng.random(N_SCORE) < 0.25
    deltas     = np.zeros(N_SCORE, dtype=lead_vals.dtype)
    deltas[lead_shift] = rng.integers(3, 8, size=lead_shift.sum())
    lead_vals  = np.clip(lead_vals + deltas, 0, 60)
    score_df['booking_lead_time_days'] = lead_vals

    # d) Previous noshow: +1 for 20% of score rows, capped at 10
    ns_vals   = score_df['previous_noshow_count'].values.copy()
    ns_shift  = rng.random(N_SCORE) < 0.20
    ns_vals[ns_shift] = np.clip(ns_vals[ns_shift] + 1, 0, 10)
    score_df['previous_noshow_count'] = ns_vals

    # ── Change 4: ID gaps in scoring data (~15% of sequence skipped) ──────────
    pool_size = int(N_SCORE * 1.30)
    id_pool   = np.arange(N_TRAIN + 1, N_TRAIN + pool_size + 1)
    available = id_pool[rng.random(pool_size) > 0.15]
    if len(available) < N_SCORE:                      # safety fallback (extremely unlikely)
        tail      = np.arange(available[-1] + 1, available[-1] + N_SCORE - len(available) + 1)
        available = np.concatenate([available, tail])
    score_ids = available[:N_SCORE]
    score_df['patient_id'] = np.char.add('PAT-', np.char.zfill(score_ids.astype(str), 6))

    # ── Save ──────────────────────────────────────────────────────────────────
    train_df.to_csv('training_data.csv', index=False)
    score_df.to_csv('scoring_data.csv',  index=False)

    # ── File summary + class balance ──────────────────────────────────────────
    n_pos    = int(train_df['missed_pathway_milestone'].sum())
    n_neg    = N_TRAIN - n_pos
    pos_rate = n_pos / N_TRAIN

    print(f"\n{'═' * 62}")
    print(f"  FILE SUMMARY")
    print(f"{'═' * 62}")
    print(f"  training_data.csv : {N_TRAIN:,} rows | "
          f"positive: {n_pos:,} ({pos_rate:.2%}) | negative: {n_neg:,}")
    print(f"  scoring_data.csv  : {len(score_df):,} rows | no outcome label")
    print(f"  Column count      : train={len(train_df.columns)}, "
          f"score={len(score_df.columns)} (train minus target)")
    print(f"  Class balance     : {'OK (34-38%)' if 0.34 <= pos_rate <= 0.38 else 'WARNING: out of range'}")

    # ── Missingness report ────────────────────────────────────────────────────
    print(f"\n{'─' * 62}")
    print(f"  MISSINGNESS REPORT  (full dataset, N={N:,})")
    print(f"{'─' * 62}")
    for col in miss_cols:
        n_miss = int(df[col].isna().sum())
        pct    = n_miss / N * 100
        print(f"  {col:<40}: {n_miss:>6,}  ({pct:.1f}%)")

    # ── Contradiction report ──────────────────────────────────────────────────
    print(f"\n{'─' * 62}")
    print(f"  CONTRADICTION REPORT  ({n_contra:,} rows modified, ~8%)")
    print(f"{'─' * 62}")
    for ctype, (label, count) in contra_labels.items():
        print(f"  Type {ctype}  [{label:<42}]: {count:,}")

    # ── Drift summary ─────────────────────────────────────────────────────────
    print(f"\n{'─' * 62}")
    print(f"  TEMPORAL DRIFT SUMMARY  (training → scoring)")
    print(f"{'─' * 62}")
    for feat in ('distance_from_hospital_km', 'booking_lead_time_days', 'previous_noshow_count'):
        t_mean = train_df[feat].mean()
        s_mean = score_df[feat].mean()
        print(f"  {feat:<40}: train={t_mean:.2f}  score={s_mean:.2f}  Δ={s_mean - t_mean:+.2f}")
    t_sp = (train_df['insurance_type'] == 'self_pay').mean()
    s_sp = (score_df['insurance_type'] == 'self_pay').mean()
    print(f"  {'insurance_type self_pay %':<40}: train={t_sp:.2%}  score={s_sp:.2%}  Δ={s_sp - t_sp:+.2%}")

    # ── ID gap check ──────────────────────────────────────────────────────────
    id_nums    = score_ids
    full_range = np.arange(id_nums[0], id_nums[-1] + 1)
    gap_count  = len(full_range) - len(id_nums)
    print(f"\n{'─' * 62}")
    print(f"  ID GAP REPORT  (scoring data only)")
    print(f"{'─' * 62}")
    print(f"  ID range  : PAT-{id_nums[0]:06d} → PAT-{id_nums[-1]:06d}")
    print(f"  Assigned  : {len(id_nums):,}  |  Gaps skipped: {gap_count:,}  "
          f"({gap_count / len(full_range):.1%} of sequence)")

    print(f"\n{'═' * 62}")


if __name__ == '__main__':
    generate_synthetic_data()

import mongoose from 'mongoose';

const { Schema } = mongoose;

export const ROLES = ['athlete', 'coach', 'scout', 'club_admin', 'organizer', 'super_admin'];

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ROLES, required: true },
    phone: { type: String, default: '', maxlength: 20 },
    county: { type: String, default: 'Garissa', maxlength: 60 },
    subCounty: { type: String, default: '', maxlength: 60 },
    dateOfBirth: Date,
    avatarUrl: { type: String, default: '' },
    isSuspended: { type: Boolean, default: false },
    suspensionReason: { type: String, default: '', maxlength: 300 },
    tokenVersion: { type: Number, default: 0 },
    guardian: {
      name: { type: String, default: '', maxlength: 80 },
      phone: { type: String, default: '', maxlength: 20 },
      relationship: { type: String, default: '', maxlength: 40 },
      consent: { type: Boolean, default: false },
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  { timestamps: true }
);

const athleteProfileSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    sport: { type: String, default: '', index: true },
    secondarySports: [{ type: String }],
    position: { type: String, default: '', maxlength: 60 },
    dominantSide: { type: String, default: '', maxlength: 20 },
    heightCm: Number,
    weightKg: Number,
    yearsActive: Number,
    bio: { type: String, default: '', maxlength: 1500 },
    skills: [{ type: String, maxlength: 40 }],
    achievements: [
      {
        title: { type: String, maxlength: 120 },
        year: Number,
        description: { type: String, maxlength: 300 },
      },
    ],
    photos: [
      {
        url: { type: String, required: true },
        caption: { type: String, default: '', maxlength: 140 },
        isPublic: { type: Boolean, default: true },
      },
    ],
    club: { type: Schema.Types.ObjectId, ref: 'Club' },
    visibility: { type: String, enum: ['public', 'scouts', 'private'], default: 'public' },
    discoverable: { type: Boolean, default: true },
    isMinor: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

athleteProfileSchema.index({ sport: 1, visibility: 1, discoverable: 1 });

const clubSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '', maxlength: 2000 },
    sport: { type: String, default: 'multi' },
    location: { type: String, default: '', maxlength: 160 },
    subCounty: { type: String, default: '', maxlength: 60 },
    founded: Number,
    contactEmail: { type: String, default: '' },
    contactPhone: { type: String, default: '' },
    logoUrl: { type: String, default: '' },
    admin: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
    verificationNote: { type: String, default: '' },
  },
  { timestamps: true }
);

const teamSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    club: { type: Schema.Types.ObjectId, ref: 'Club' },
    sport: { type: String, required: true },
    coach: { type: Schema.Types.ObjectId, ref: 'User' },
    description: { type: String, default: '', maxlength: 1000 },
    homeGround: { type: String, default: '', maxlength: 160 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const teamMemberSchema = new Schema(
  {
    team: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    athlete: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    jerseyNumber: Number,
    squadRole: { type: String, enum: ['player', 'captain'], default: 'player' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);
teamMemberSchema.index({ team: 1, athlete: 1 }, { unique: true });

const tournamentSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    sport: { type: String, required: true },
    organizer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    description: { type: String, default: '', maxlength: 2000 },
    rules: { type: String, default: '', maxlength: 2000 },
    location: { type: String, default: '', maxlength: 160 },
    startDate: Date,
    endDate: Date,
    format: { type: String, enum: ['league', 'knockout'], default: 'league' },
    status: { type: String, enum: ['draft', 'open', 'ongoing', 'completed'], default: 'open' },
    maxTeams: { type: Number, default: 16 },
  },
  { timestamps: true }
);

const registrationSchema = new Schema(
  {
    tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true },
    team: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    note: { type: String, default: '' },
  },
  { timestamps: true }
);
registrationSchema.index({ tournament: 1, team: 1 }, { unique: true });

const matchSchema = new Schema(
  {
    tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true, index: true },
    homeTeam: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    awayTeam: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    scheduledAt: Date,
    venue: { type: String, default: '' },
    round: { type: String, default: '' },
    homeScore: { type: Number, min: 0 },
    awayScore: { type: Number, min: 0 },
    status: { type: String, enum: ['scheduled', 'live', 'completed'], default: 'scheduled' },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const statisticSchema = new Schema(
  {
    athlete: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    sport: { type: String, default: '' },
    recordedAt: { type: Date, default: Date.now },
    match: { type: Schema.Types.ObjectId, ref: 'Match' },
    metrics: [{ key: { type: String, maxlength: 40 }, value: Number }],
    notes: { type: String, default: '', maxlength: 300 },
  },
  { timestamps: true }
);

const trainingSessionSchema = new Schema(
  {
    team: { type: Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    coach: { type: Schema.Types.ObjectId, ref: 'User' },
    title: { type: String, required: true, maxlength: 140 },
    startsAt: { type: Date, required: true },
    location: { type: String, default: '', maxlength: 160 },
    notes: { type: String, default: '', maxlength: 500 },
  },
  { timestamps: true }
);

const attendanceSchema = new Schema(
  {
    session: { type: Schema.Types.ObjectId, ref: 'TrainingSession', required: true },
    athlete: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['present', 'absent', 'late', 'excused'], required: true },
  },
  { timestamps: true }
);
attendanceSchema.index({ session: 1, athlete: 1 }, { unique: true });

const opportunitySchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    type: { type: String, enum: ['trial', 'scholarship', 'recruitment', 'other'], required: true },
    sport: { type: String, required: true },
    description: { type: String, required: true, maxlength: 3000 },
    requirements: { type: String, default: '', maxlength: 1000 },
    organization: { type: String, default: '', maxlength: 160 },
    location: { type: String, default: '', maxlength: 160 },
    deadline: Date,
    postedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['draft', 'published', 'closed'], default: 'published' },
  },
  { timestamps: true }
);

const applicationSchema = new Schema(
  {
    opportunity: { type: Schema.Types.ObjectId, ref: 'Opportunity', required: true },
    athlete: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, default: '', maxlength: 1000 },
    status: { type: String, enum: ['submitted', 'reviewing', 'accepted', 'rejected'], default: 'submitted' },
  },
  { timestamps: true }
);
applicationSchema.index({ opportunity: 1, athlete: 1 }, { unique: true });

const notificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, maxlength: 160 },
    message: { type: String, required: true, maxlength: 500 },
    type: { type: String, default: 'system' },
    link: { type: String, default: '' },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const savedAthleteSchema = new Schema(
  {
    scout: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    athlete: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    note: { type: String, default: '', maxlength: 300 },
  },
  { timestamps: true }
);
savedAthleteSchema.index({ scout: 1, athlete: 1 }, { unique: true });

const reportSchema = new Schema(
  {
    reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: ['user', 'athlete', 'club', 'opportunity'], required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    reason: { type: String, required: true, maxlength: 1000 },
    status: { type: String, enum: ['open', 'reviewed', 'dismissed'], default: 'open' },
  },
  { timestamps: true }
);

export const User = mongoose.model('User', userSchema);
export const AthleteProfile = mongoose.model('AthleteProfile', athleteProfileSchema);
export const Club = mongoose.model('Club', clubSchema);
export const Team = mongoose.model('Team', teamSchema);
export const TeamMember = mongoose.model('TeamMember', teamMemberSchema);
export const Tournament = mongoose.model('Tournament', tournamentSchema);
export const Registration = mongoose.model('Registration', registrationSchema);
export const Match = mongoose.model('Match', matchSchema);
export const Statistic = mongoose.model('Statistic', statisticSchema);
export const TrainingSession = mongoose.model('TrainingSession', trainingSessionSchema);
export const Attendance = mongoose.model('Attendance', attendanceSchema);
export const Opportunity = mongoose.model('Opportunity', opportunitySchema);
export const Application = mongoose.model('Application', applicationSchema);
export const Notification = mongoose.model('Notification', notificationSchema);
export const SavedAthlete = mongoose.model('SavedAthlete', savedAthleteSchema);
export const Report = mongoose.model('Report', reportSchema);

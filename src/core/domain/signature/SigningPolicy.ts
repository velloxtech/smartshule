export type DocumentSigningOrder = 'SEQUENTIAL' | 'PARALLEL';

export interface SignaturePlacement {
  role: string; // e.g. 'CLASS_TEACHER', 'HEAD_TEACHER', 'BURSAR', 'PRINCIPAL'
  label: string; // e.g. 'Class Teacher's Signature', 'Head Teacher's Endorsement'
  page: number | 'FIRST' | 'LAST' | 'ALL';
  position: 'BOTTOM_LEFT' | 'BOTTOM_RIGHT' | 'BOTTOM_CENTER' | 'CUSTOM';
  xMm?: number;
  yMm?: number;
  widthMm?: number;
  heightMm?: number;
  order: number; // 1 for first signatory, 2 for second, etc.
  isRequired: boolean;
}

export interface SigningPolicyProps {
  id: string;
  documentType: string;
  title: string;
  description: string;
  requiresSignature: boolean;
  allowedRoles: string[];
  requiredSignaturesCount: number;
  signingOrder: DocumentSigningOrder;
  allowBulkSigning: boolean;
  placements: SignaturePlacement[];
  createdAt: Date;
  updatedAt: Date;
}

export class SigningPolicy {
  private readonly _id: string;
  private readonly _documentType: string;
  private _title: string;
  private _description: string;
  private _requiresSignature: boolean;
  private _allowedRoles: string[];
  private _requiredSignaturesCount: number;
  private _signingOrder: DocumentSigningOrder;
  private _allowBulkSigning: boolean;
  private _placements: SignaturePlacement[];
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: SigningPolicyProps) {
    if (!props.id) throw new Error('Policy ID is required');
    if (!props.documentType) throw new Error('Document type is required');
    if (!props.title) throw new Error('Policy title is required');

    this._id = props.id;
    this._documentType = props.documentType;
    this._title = props.title;
    this._description = props.description || '';
    this._requiresSignature = props.requiresSignature ?? true;
    this._allowedRoles = props.allowedRoles || [];
    this._requiredSignaturesCount = props.requiredSignaturesCount || 1;
    this._signingOrder = props.signingOrder || 'PARALLEL';
    this._allowBulkSigning = props.allowBulkSigning ?? false;
    this._placements = props.placements || [];
    this._createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();
  }

  get id(): string { return this._id; }
  get documentType(): string { return this._documentType; }
  get title(): string { return this._title; }
  get description(): string { return this._description; }
  get requiresSignature(): boolean { return this._requiresSignature; }
  get allowedRoles(): string[] { return this._allowedRoles; }
  get requiredSignaturesCount(): number { return this._requiredSignaturesCount; }
  get signingOrder(): DocumentSigningOrder { return this._signingOrder; }
  get allowBulkSigning(): boolean { return this._allowBulkSigning; }
  get placements(): SignaturePlacement[] { return this._placements; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }

  public updatePolicy(update: Partial<Omit<SigningPolicyProps, 'id' | 'documentType' | 'createdAt'>>): void {
    if (update.title !== undefined) this._title = update.title;
    if (update.description !== undefined) this._description = update.description;
    if (update.requiresSignature !== undefined) this._requiresSignature = update.requiresSignature;
    if (update.allowedRoles !== undefined) this._allowedRoles = update.allowedRoles;
    if (update.requiredSignaturesCount !== undefined) this._requiredSignaturesCount = update.requiredSignaturesCount;
    if (update.signingOrder !== undefined) this._signingOrder = update.signingOrder;
    if (update.allowBulkSigning !== undefined) this._allowBulkSigning = update.allowBulkSigning;
    if (update.placements !== undefined) this._placements = update.placements;
    this._updatedAt = new Date();
  }

  public isRoleAllowed(role: string): boolean {
    const normalized = role.trim().toUpperCase();
    return this._allowedRoles.some(r => {
      const nr = r.trim().toUpperCase();
      if (nr === normalized) return true;
      if ((normalized === 'TEACHER' || normalized === 'CLASS_TEACHER') && (nr === 'TEACHER' || nr === 'CLASS_TEACHER')) return true;
      return false;
    }) || normalized === 'SUPER_ADMIN';
  }

  public toJSON(): SigningPolicyProps {
    return {
      id: this._id,
      documentType: this._documentType,
      title: this._title,
      description: this._description,
      requiresSignature: this._requiresSignature,
      allowedRoles: this._allowedRoles,
      requiredSignaturesCount: this._requiredSignaturesCount,
      signingOrder: this._signingOrder,
      allowBulkSigning: this._allowBulkSigning,
      placements: this._placements,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt
    };
  }
}

export function getDefaultSigningPolicies(): SigningPolicyProps[] {
  const now = new Date();
  return [
    {
      id: 'pol-report-card',
      documentType: 'REPORT_CARD',
      title: 'CBC Summative Learner Report Card',
      description: 'End-of-term competency and assessment report card for learners requiring class teacher and head teacher endorsement.',
      requiresSignature: true,
      allowedRoles: ['CLASS_TEACHER', 'HEAD_TEACHER', 'PRINCIPAL', 'SUPER_ADMIN'],
      requiredSignaturesCount: 2,
      signingOrder: 'SEQUENTIAL',
      allowBulkSigning: true,
      placements: [
        {
          role: 'CLASS_TEACHER',
          label: "Class Teacher's Signature",
          page: 'LAST',
          position: 'BOTTOM_LEFT',
          xMm: 18,
          yMm: 260,
          widthMm: 45,
          heightMm: 16,
          order: 1,
          isRequired: true
        },
        {
          role: 'HEAD_TEACHER',
          label: "Head Teacher's Endorsement & Stamp",
          page: 'LAST',
          position: 'BOTTOM_RIGHT',
          xMm: 115,
          yMm: 260,
          widthMm: 50,
          heightMm: 16,
          order: 2,
          isRequired: true
        }
      ],
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'pol-broadsheet',
      documentType: 'BROADSHEET',
      title: 'Academic Master Broadsheet',
      description: 'Termly class and grade-level consolidated score broadsheet for academic records.',
      requiresSignature: true,
      allowedRoles: ['EXAM_OFFICER', 'HEAD_TEACHER', 'PRINCIPAL', 'SUPER_ADMIN', 'DEPUTY_HEAD_TEACHER'],
      requiredSignaturesCount: 2,
      signingOrder: 'PARALLEL',
      allowBulkSigning: true,
      placements: [
        {
          role: 'EXAM_OFFICER',
          label: 'Examinations Officer',
          page: 'LAST',
          position: 'BOTTOM_LEFT',
          xMm: 20,
          yMm: 185,
          widthMm: 45,
          heightMm: 15,
          order: 1,
          isRequired: true
        },
        {
          role: 'HEAD_TEACHER',
          label: 'Head Teacher / Principal',
          page: 'LAST',
          position: 'BOTTOM_RIGHT',
          xMm: 200,
          yMm: 185,
          widthMm: 45,
          heightMm: 15,
          order: 2,
          isRequired: true
        }
      ],
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'pol-fee-statement',
      documentType: 'FEE_STATEMENT',
      title: 'Official Student Fee Statement',
      description: 'Termly or annual student fee statement showing billing, payments, and arrears.',
      requiresSignature: true,
      allowedRoles: ['BURSAR', 'ACCOUNTANT', 'FINANCE', 'SUPER_ADMIN'],
      requiredSignaturesCount: 1,
      signingOrder: 'PARALLEL',
      allowBulkSigning: true,
      placements: [
        {
          role: 'BURSAR',
          label: 'Accounts / Finance Department',
          page: 'LAST',
          position: 'BOTTOM_RIGHT',
          xMm: 130,
          yMm: 250,
          widthMm: 45,
          heightMm: 15,
          order: 1,
          isRequired: true
        }
      ],
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'pol-fee-receipt',
      documentType: 'FEE_RECEIPT',
      title: 'Official Fee Payment Receipt',
      description: 'Proof of fee payment recorded in the financial ledger.',
      requiresSignature: true,
      allowedRoles: ['BURSAR', 'ACCOUNTANT', 'FINANCE', 'SUPER_ADMIN'],
      requiredSignaturesCount: 1,
      signingOrder: 'PARALLEL',
      allowBulkSigning: false,
      placements: [
        {
          role: 'BURSAR',
          label: 'Accounts / Cashier Stamp & Signature',
          page: 'LAST',
          position: 'BOTTOM_RIGHT',
          xMm: 130,
          yMm: 120,
          widthMm: 45,
          heightMm: 15,
          order: 1,
          isRequired: true
        }
      ],
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'pol-payroll-voucher',
      documentType: 'PAYROLL_VOUCHER',
      title: 'Staff Salary Payment Voucher',
      description: 'Monthly payroll payment voucher detailing statutory deductions and net remuneration.',
      requiresSignature: true,
      allowedRoles: ['BURSAR', 'DIRECTOR', 'PRINCIPAL', 'SUPER_ADMIN'],
      requiredSignaturesCount: 2,
      signingOrder: 'SEQUENTIAL',
      allowBulkSigning: true,
      placements: [
        {
          role: 'BURSAR',
          label: 'Prepared by (Bursar)',
          page: 'LAST',
          position: 'BOTTOM_LEFT',
          xMm: 20,
          yMm: 250,
          widthMm: 45,
          heightMm: 15,
          order: 1,
          isRequired: true
        },
        {
          role: 'DIRECTOR',
          label: 'Authorized by (Director / Principal)',
          page: 'LAST',
          position: 'BOTTOM_RIGHT',
          xMm: 130,
          yMm: 250,
          widthMm: 45,
          heightMm: 15,
          order: 2,
          isRequired: true
        }
      ],
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'pol-purchase-request',
      documentType: 'PURCHASE_REQUEST',
      title: 'Procurement / Store Purchase Order',
      description: 'Requisition order for school supplies and stock inventory purchases.',
      requiresSignature: true,
      allowedRoles: ['STOREKEEPER', 'BURSAR', 'DIRECTOR', 'SUPER_ADMIN'],
      requiredSignaturesCount: 2,
      signingOrder: 'SEQUENTIAL',
      allowBulkSigning: false,
      placements: [
        {
          role: 'STOREKEEPER',
          label: 'Initiated by (Storekeeper)',
          page: 'LAST',
          position: 'BOTTOM_LEFT',
          xMm: 20,
          yMm: 240,
          widthMm: 45,
          heightMm: 15,
          order: 1,
          isRequired: true
        },
        {
          role: 'DIRECTOR',
          label: 'Approved by (Director / Finance)',
          page: 'LAST',
          position: 'BOTTOM_RIGHT',
          xMm: 130,
          yMm: 240,
          widthMm: 45,
          heightMm: 15,
          order: 2,
          isRequired: true
        }
      ],
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'pol-announcement',
      documentType: 'ANNOUNCEMENT',
      title: 'Official Circular & Notice',
      description: 'Formal school announcement or communication circular to parents and staff.',
      requiresSignature: true,
      allowedRoles: ['HEAD_TEACHER', 'PRINCIPAL', 'DIRECTOR', 'SUPER_ADMIN'],
      requiredSignaturesCount: 1,
      signingOrder: 'PARALLEL',
      allowBulkSigning: false,
      placements: [
        {
          role: 'HEAD_TEACHER',
          label: 'Head of Institution',
          page: 'LAST',
          position: 'BOTTOM_RIGHT',
          xMm: 130,
          yMm: 240,
          widthMm: 50,
          heightMm: 15,
          order: 1,
          isRequired: true
        }
      ],
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'pol-attendance-register',
      documentType: 'ATTENDANCE_REGISTER',
      title: 'Official Class Attendance Register',
      description: 'Verified daily or monthly student attendance roll-call summary.',
      requiresSignature: true,
      allowedRoles: ['CLASS_TEACHER', 'TEACHER', 'DEPUTY_HEAD_TEACHER', 'SUPER_ADMIN'],
      requiredSignaturesCount: 1,
      signingOrder: 'PARALLEL',
      allowBulkSigning: true,
      placements: [
        {
          role: 'CLASS_TEACHER',
          label: 'Class Teacher Certification',
          page: 'LAST',
          position: 'BOTTOM_RIGHT',
          xMm: 130,
          yMm: 250,
          widthMm: 45,
          heightMm: 15,
          order: 1,
          isRequired: true
        }
      ],
      createdAt: now,
      updatedAt: now
    }
  ];
}

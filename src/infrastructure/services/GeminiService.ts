import env from '../config/env';

export interface GeminiDraftParams {
  command: string;
  student: {
    fullName: string;
    admissionNumber: string;
    gradeLevel: string;
    streamId?: string;
  };
  guardian: {
    fullName?: string;
    relationship?: string;
    phone: string;
  };
  feeSummary?: {
    totalBilled: number;
    totalPaid: number;
    balance: number;
    paymentUrl?: string;
    kcbAccount?: string;
    dueDate?: string;
  };
  attendanceSummary?: {
    presentCount: number;
    absentCount: number;
    percentage: number;
    lastRecordedDate?: string;
  };
  cbcSummary?: {
    recentAssessments?: Array<{ learningArea: string; strand: string; scoreLevel: string }>;
    averagePerformance?: string;
    teacherRemarks?: string;
  };
  ediarySummary?: {
    recentHomework?: string;
    teacherRemarks?: string;
    requirementsTomorrow?: string;
  };
  schoolName?: string;
  schoolPhone?: string;
  tone?: 'professional' | 'urgent' | 'friendly' | 'concise';
}

export class GeminiService {
  private readonly apiKey: string;
  private readonly model: string;

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || env.gemini.apiKey || process.env.GEMINI_API_KEY || '';
    // Default to gemini-2.5-flash which is confirmed active and supported on the v1beta endpoint
    this.model = model || env.gemini.model || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  }

  /**
   * Directly generates text using Google Gemini Generative Language API
   */
  public async generateContent(prompt: string, customModel?: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in environment.');
    }

    const modelToUse = customModel || this.model;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${this.apiKey}`;

    const payload = {
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 600,
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = (errorData as any)?.error?.message || response.statusText;
      
      // If the model was not found (e.g. 1.5 deprecated), try fallback models
      if (response.status === 404 && modelToUse !== 'gemini-2.5-flash') {
        console.warn(`[GeminiService] Model ${modelToUse} failed with 404, falling back to gemini-2.5-flash...`);
        return this.generateContent(prompt, 'gemini-2.5-flash');
      }

      throw new Error(`Gemini API error (${response.status}): ${errorMsg}`);
    }

    const data = (await response.json()) as any;
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Gemini returned an empty response.');
    }

    return text.trim();
  }

  /**
   * Drafts a targeted WhatsApp message tailored to real database facts and a user command
   */
  public async draftWhatsAppMessage(params: GeminiDraftParams): Promise<string> {
    const {
      command,
      student,
      guardian,
      feeSummary,
      attendanceSummary,
      cbcSummary,
      ediarySummary,
      tone = 'professional'
    } = params;

    const guardianName = guardian.fullName || 'Parent/Guardian';
    const learnerName = student.fullName;
    const admNo = student.admissionNumber;
    const grade = student.gradeLevel;

    const feeText = feeSummary
      ? `Outstanding Balance: KES ${feeSummary.balance.toLocaleString()} (Total Billed: KES ${feeSummary.totalBilled.toLocaleString()}, Paid: KES ${feeSummary.totalPaid.toLocaleString()}). KCB Bank Paybill: ${feeSummary.kcbAccount || '522123 (Ref: ' + admNo + ')'}. Online Payment: ${feeSummary.paymentUrl || 'https://pay.smartshule.ac.ke/fees/' + admNo}.`
      : 'Fee details not requested or not available.';

    const attendanceText = attendanceSummary
      ? `Attendance Rate: ${attendanceSummary.percentage}% (${attendanceSummary.presentCount} present, ${attendanceSummary.absentCount} absent).`
      : 'Attendance details not requested.';

    const cbcText = cbcSummary
      ? `Performance: ${cbcSummary.averagePerformance || 'Meeting Expectations (ME)'}. Remarks: ${cbcSummary.teacherRemarks || 'Good academic engagement.'}`
      : 'CBC performance details not requested.';

    const ediaryText = ediarySummary
      ? `Homework: ${ediarySummary.recentHomework || 'Review daily class notes'}. Remarks: ${ediarySummary.teacherRemarks || 'All tasks on schedule'}. Tomorrow's requirements: ${ediarySummary.requirementsTomorrow || 'Standard books and kit'}.`
      : 'eDiary homework not requested.';

    const schoolName = params.schoolName || 'SmartShule CBC Portal';
    const schoolPhone = params.schoolPhone || '';

    const prompt = `
You are the official SmartShule School Communications Assistant for ${schoolName}.
Your task is to draft a personalized, accurate, polite, and professional WhatsApp message to a real parent/guardian based on the school administrator's command and verified student database records.

COMMAND / INSTRUCTION:
"${command}"

VERIFIED DATABASE PROFILE OF RECIPIENT & STUDENT:
- Parent/Guardian: ${guardianName} (${guardian.phone})
- Enrolled Student: ${learnerName}
- Admission Number: ${admNo}
- Grade Level: ${grade}
- Financial / Fee Records: ${feeText}
- Attendance Records: ${attendanceText}
- CBC Academic Assessment: ${cbcText}
- eDiary Homework: ${ediaryText}

DESIRED TONE:
${tone} (must remain respectful, helpful, and official)

MANDATORY RULES:
1. Use WhatsApp markdown: *bold* for key numbers, student name, and headlines. Use emojis appropriately (e.g. 💰, 📖, 📅, 🏫, ✅) to make it readable and friendly.
2. Address the parent courteously: e.g. "Dear ${guardianName}," or "Dear Parent of ${learnerName},"
3. ONLY use the REAL numbers and data provided above. DO NOT invent or hallucinate balances, dates, or contacts.
4. STRICT RELEVANCE: Only include information directly answering the inquiry. DO NOT mention fees, balances, or payments unless the user specifically asked about fees, payments, or invoices.
5. Keep the message concise and actionable so it reads easily on a mobile WhatsApp screen.
6. Sign off officially with:
   *${schoolName} Administration*
   ${schoolPhone ? `_Admissions & Enquiries: ${schoolPhone}_` : ''}
7. Output ONLY the raw WhatsApp message text ready to be sent. Do NOT include any markdown code blocks, backticks, conversational preamble, or explanations.
`;

    try {
      if (this.apiKey) {
        return await this.generateContent(prompt);
      }
    } catch (err: any) {
      console.warn('[GeminiService] Gemini API call failed, falling back to dynamic template generator:', err.message);
    }

    // Fallback template generator if Gemini is offline or API key is not present
    return this.generateFallbackDraft(params);
  }

  /**
   * Dynamic fallback generator that uses real database facts if Gemini API is temporarily unavailable
   */
  private generateFallbackDraft(params: GeminiDraftParams): string {
    const { command, student, guardian, feeSummary, attendanceSummary, cbcSummary, ediarySummary } = params;
    const cmdUpper = command.toUpperCase();
    const guardianName = guardian.fullName || 'Parent/Guardian';
    const learner = student.fullName;
    const adm = student.admissionNumber;
    const schoolName = params.schoolName || 'SmartShule CBC Portal';
    const schoolPhone = params.schoolPhone || '';
    const contactLine = schoolPhone ? `_Contact: ${schoolPhone}_` : '';

    if (/\b(HOMEWORK|EDIARY|DIARY|ASSIGNMENT|ASSIGNMENTS|TASK|TASKS)\b/i.test(cmdUpper)) {
      return (
        `👋 *Dear ${guardianName},*\n\n` +
        `Here is today's CBC eDiary homework notice for *${learner}* (Adm: *${adm}* · ${student.gradeLevel}):\n\n` +
        `📖 *Assigned Homework:*\n` +
        `${ediarySummary?.recentHomework || 'No pending homework recorded for today.'}\n\n` +
        `🎒 *Requirements for Tomorrow:*\n` +
        `${ediarySummary?.requirementsTomorrow || 'Standard learning materials.'}\n\n` +
        `Please inspect your child's work and acknowledge via the eDiary portal.\n\n` +
        `Warm regards,\n` +
        `*${schoolName} Teaching Staff*\n` +
        contactLine
      );
    }

    if (/\b(ATTEND|ATTENDANCE|ABSENT|ABSENCE|ROLLCALL)\b/i.test(cmdUpper)) {
      const pct = attendanceSummary ? attendanceSummary.percentage : 0;
      const absent = attendanceSummary ? attendanceSummary.absentCount : 0;
      return (
        `👋 *Dear ${guardianName},*\n\n` +
        `Regarding *${learner}* (Adm: *${adm}* · ${student.gradeLevel}):\n\n` +
        `📅 *Term Attendance Summary:*\n` +
        `• Overall Attendance: *${pct}%*\n` +
        `• Recorded Absences: *${absent} day(s)*\n\n` +
        `Consistent attendance is essential for CBC curriculum progress. Please notify us if your child is unwell or unable to attend.\n\n` +
        `Warm regards,\n` +
        `*${schoolName} Administration*\n` +
        contactLine
      );
    }

    if (/\b(CBC|RESULT|RESULTS|REPORT|GRADE|GRADES|PERFORMANCE|RUBRIC)\b/i.test(cmdUpper)) {
      return (
        `👋 *Dear ${guardianName},*\n\n` +
        `We are pleased to share a CBC academic update for *${learner}* (Adm: *${adm}* · ${student.gradeLevel}):\n\n` +
        `🌟 *CBC Competency Evaluation:*\n` +
        `• Overall Performance: *${cbcSummary?.averagePerformance || 'Recorded in portal'}*\n` +
        `• Teacher Remarks: _"${cbcSummary?.teacherRemarks || 'Continuous assessment progress recorded in SmartShule.'}"_\n\n` +
        `You can review complete strand-by-strand CBC assessments via the SmartShule parent portal.\n\n` +
        `Warm regards,\n` +
        `*${schoolName} Academic Directorate*\n` +
        contactLine
      );
    }

    if (/\b(FEE|FEES|BALANCE|BAL|PAY|PAYMENT|ARREARS|DUE|INVOICE|INVOICES|STATEMENT|STATEMENTS)\b/i.test(cmdUpper)) {
      const bal = feeSummary ? feeSummary.balance.toLocaleString() : '0';
      const paymentLink = feeSummary?.paymentUrl || `https://pay.smartshule.ac.ke/pay/${student.admissionNumber}`;
      return (
        `👋 *Dear ${guardianName},*\n\n` +
        `This is an official fee update from *${schoolName}* for *${learner}* (Adm: *${adm}* · ${student.gradeLevel}).\n\n` +
        `💰 *Current Outstanding Balance:* KES *${bal}*\n\n` +
        `💳 *Payment Options:*\n` +
        `• *Online Payment (Card / Bank):* ${paymentLink}\n` +
        `• *KCB / M-Pesa Paybill:* 522123 (Acc: *${adm}*)\n\n` +
        `Kindly settle the outstanding amount or reach out to our accounts desk.\n\n` +
        `Warm regards,\n` +
        `*${schoolName} Accounts Desk*\n` +
        contactLine
      );
    }

    // Default general message
    return (
      `👋 *Dear ${guardianName},*\n\n` +
      `Official communication from *${schoolName}* concerning *${learner}* (Adm: *${adm}* · ${student.gradeLevel}):\n\n` +
      `Thank you for your message: "${command}". Our administration desk has received your request.\n\n` +
      `Please contact the school office if you have any questions.\n\n` +
      `Warm regards,\n` +
      `*${schoolName} Administration*\n` +
      contactLine
    );
  }
}

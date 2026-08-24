import { DailyActivity } from './types';

export function generateWidaPDF(activities: DailyActivity[], periodName: string = 'تقرير الإنجازات والإنتاجية') {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('يرجى السماح بفتح النوافذ المنبثقة لتنزيل التقرير.');
    return;
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateFormatted = `${year}/${month}/${day}`;

  const totalQuantity = activities.reduce((sum, a) => sum + a.quantity, 0);
  const uniqueEmployees = new Set(activities.map(a => a.employee_name || a.employee_id)).size;

  const rowsHtml = activities.length === 0 ? `
    <tr>
      <td colspan="4" style="text-align: center; padding: 18px; color: #666; font-size: 12px;">لا توجد إنجازات مسجلة لهذه الفترة بعد</td>
    </tr>
  ` : activities.map((a) => `
    <tr style="border-bottom: 1px solid #111111;">
      <td style="padding: 10px 14px; font-weight: 700; color: #111111; border-left: 1px solid #111111; vertical-align: top;">${a.employee_name || 'غير محدد'}</td>
      <td style="padding: 10px 14px; color: #111111; font-weight: 600; border-left: 1px solid #111111; vertical-align: top;">
        تم ${a.action_type_name || ''} (${a.entity_type_name || ''})
      </td>
      <td style="padding: 10px 14px; font-weight: 800; color: #581c87; text-align: center; border-left: 1px solid #111111; vertical-align: top;">${a.quantity}</td>
      <td style="padding: 10px 14px; color: #333333; text-align: center; font-size: 11px; vertical-align: top;">${a.activity_date}</td>
    </tr>
  `).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>${periodName} - WIDA</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Alexandria:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        @page {
          size: A4;
          margin: 0;
        }
        * {
          box-sizing: border-box;
          font-family: 'Alexandria', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        body {
          margin: 0;
          padding: 0;
          background-color: #ffffff;
          color: #111111;
          direction: rtl;
          font-size: 12px;
          line-height: 1.6;
          min-height: 100vh;
          display: flex;
          flex-col;
          justify-content: space-between;
        }
        .page-container {
          padding: 40px 50px 120px 50px;
          width: 100%;
        }
        
        /* Top Header matching PDF reference */
        .pdf-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          width: 100%;
          margin-bottom: 20px;
        }
        .wida-logo-img {
          height: 46px;
          object-fit: contain;
          filter: brightness(0);
        }
        .date-badge {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 13px;
          font-weight: 700;
          color: #111111;
        }
        .purple-accent-polygon {
          width: 22px;
          height: 22px;
          background-color: #8b5cf6;
          clip-path: polygon(0 0, 100% 0, 100% 100%);
        }

        /* Document Title */
        .doc-title {
          text-align: center;
          font-size: 20px;
          font-weight: 800;
          color: #111111;
          margin: 25px 0 20px 0;
        }

        /* Salutation Text */
        .salutation {
          margin-bottom: 20px;
        }
        .salutation h4 {
          margin: 0 0 6px 0;
          font-size: 14px;
          font-weight: 800;
          color: #111111;
        }
        .salutation p {
          margin: 0;
          font-size: 12px;
          color: #222222;
        }

        /* Section Headings matching Cyan style in PDF reference */
        .section-title {
          color: #0ea5e9;
          font-size: 13px;
          font-weight: 700;
          margin: 25px 0 12px 0;
        }

        /* Table matching WIDA's exact Purple Header style in reference PDF */
        .wida-pdf-table {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid #111111;
          margin-top: 10px;
        }
        .wida-pdf-table th {
          background-color: #581c87;
          color: #ffffff;
          padding: 12px 14px;
          font-weight: 700;
          font-size: 12px;
          border-left: 1px solid #111111;
          text-align: right;
        }
        .wida-pdf-table th:last-child {
          border-left: none;
          text-align: center;
        }

        /* Bullet Points List */
        .bullet-list {
          list-style: none;
          padding: 0;
          margin: 10px 0 20px 0;
        }
        .bullet-list li {
          position: relative;
          padding-right: 18px;
          margin-bottom: 8px;
          font-size: 11.5px;
          color: #222222;
        }
        .bullet-list li::before {
          content: "●";
          position: absolute;
          right: 0;
          color: #111111;
          font-size: 10px;
        }

        /* Footer matching the exact bottom block of WIDA's PDF */
        .pdf-footer-wrapper {
          width: 100%;
          background-color: #ffffff;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
        }
        .pdf-footer-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          padding: 0 50px 20px 50px;
          font-size: 10.5px;
          color: #111111;
          font-weight: 600;
        }
        .footer-col {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .footer-col.center {
          text-align: center;
          font-weight: 700;
        }
        .footer-col.social {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 6px;
        }
        .social-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: #111111;
        }

        /* Bottom Gradient Edge Bar */
        .bottom-gradient-bar {
          height: 14px;
          width: 100%;
          background: linear-gradient(90deg, #e9d5ff 0%, #a855f7 40%, #ec4899 100%);
        }

        @media print {
          .no-print {
            display: none !important;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body>
      <div class="page-container">
        <!-- Print Button Bar (no print) -->
        <div class="no-print" style="margin-bottom: 20px; text-align: left;">
          <button onclick="window.print()" style="background: #581c87; color: white; border: none; padding: 10px 24px; border-radius: 8px; font-weight: 700; cursor: pointer; font-family: 'Alexandria'; font-size: 13px;">
            🖨️ طباعة التقرير / حفظ PDF
          </button>
        </div>

        <!-- Header matching PDF reference -->
        <div class="pdf-header">
          <div class="date-badge">
            <span>${dateFormatted}</span>
            <div class="purple-accent-polygon"></div>
          </div>
          <div>
            <img src="/WidaLOGO.png" alt="WIDA Logo" class="wida-logo-img" />
          </div>
        </div>

        <!-- Title -->
        <div class="doc-title">
          ${periodName}
        </div>

        <!-- Salutation -->
        <div class="salutation">
          <h4>إدارة شركة وايدا المحترمين،،،</h4>
          <p>السلام عليكم ورحمة الله وبركاته،</p>
          <p style="margin-top: 4px;">بعد التحية ؛ يسرنا إطلاعكم على تقرير الإنجازات والأنشطة اليومية لفريق العمل بالبيانات الموثقة أدناه:</p>
        </div>

        <!-- Summary Section -->
        <div class="section-title">ملخص الإنجازات الموثقة:</div>
        <table class="wida-pdf-table" style="margin-bottom: 20px;">
          <thead>
            <tr>
              <th>المؤشر الإحصائي</th>
              <th style="text-align: center;">القيمة الرقمية</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #111111;">
              <td style="padding: 10px 14px; font-weight: 700; border-left: 1px solid #111111;">إجمالي المخرجات والإنجازات المسجلة</td>
              <td style="padding: 10px 14px; font-weight: 800; color: #581c87; text-align: center;">${totalQuantity} إنجاز</td>
            </tr>
            <tr style="border-bottom: 1px solid #111111;">
              <td style="padding: 10px 14px; font-weight: 700; border-left: 1px solid #111111;">عدد الموظفين المساهمين في الإنجاز</td>
              <td style="padding: 10px 14px; font-weight: 800; color: #581c87; text-align: center;">${uniqueEmployees} موظفين</td>
            </tr>
            <tr>
              <td style="padding: 10px 14px; font-weight: 700; border-left: 1px solid #111111;">إجمالي الأنشطة الموثقة</td>
              <td style="padding: 10px 14px; font-weight: 800; color: #581c87; text-align: center;">${activities.length} سجلات</td>
            </tr>
          </tbody>
        </table>

        <!-- Activities Section -->
        <div class="section-title">جدول تفاصيل الأنشطة والإنجازات الموثقة:</div>
        <table class="wida-pdf-table">
          <thead>
            <tr>
              <th style="width: 25%;">الموظف المسؤول</th>
              <th style="width: 45%;">تفاصيل الإنجاز والعملية</th>
              <th style="width: 15%; text-align: center;">الكمية</th>
              <th style="width: 15%; text-align: center;">التاريخ</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <!-- Guidelines / Notes List -->
        <div class="section-title">ملاحظات واعتماد التوثيق:</div>
        <ul class="bullet-list">
          <li>تم استخراج وتوثيق جميع البيانات أعلاه تلقائياً عبر نظام وايدا الذكي WIDA Intelligence.</li>
          <li>تُحسب الأنشطة والكميات وفقاً للسجلات اليومية المعتمدة من قِبل منسق العمليات.</li>
          <li>هذا التقرير موثق رسمياً في قاعدة بيانات الشركة لتسجيل الإنجازات اليومية.</li>
        </ul>
      </div>

      <!-- Footer matching reference PDF -->
      <div class="pdf-footer-wrapper">
        <div class="pdf-footer-content">
          <div class="footer-col">
            <div>No. 140 Al Yasmeen Dist.</div>
            <div>13326 Riyadh</div>
            <div>Kingdom of Saudi Arabia</div>
          </div>
          <div class="footer-col center">
            <div style="font-size: 12px; margin-bottom: 2px;">920007949</div>
            <div style="font-size: 11px; color: #111111;">info@wida.sa</div>
          </div>
          <div class="footer-col social">
            <div style="margin-left: 15px;">Wida.sa</div>
            <div class="social-badge">wida_ksa</div>
          </div>
        </div>
        <div class="bottom-gradient-bar"></div>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 600);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

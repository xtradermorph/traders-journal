import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } from 'docx';
import { TopDownAnalysis, TDAQuestion, TDAAnswer, TDATimeframeAnalysis, TDAAnnouncement, TDAScreenshot } from '@/types/tda';
import { format } from 'date-fns';

export interface TDADocumentData {
  analysis: TopDownAnalysis;
  timeframe_analyses: TDATimeframeAnalysis[];
  answers: TDAAnswer[];
  questions: TDAQuestion[];
  screenshots: TDAScreenshot[];
  announcements: TDAAnnouncement[];
  analystName: string;
}

export async function generateTDAWordDocument(data: TDADocumentData): Promise<Uint8Array> {
  const { analysis, analystName, questions, answers, announcements } = data;

  // Create document
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: 1440, // 1 inch
            right: 1440,
            bottom: 1440,
            left: 1440,
          },
        },
      },
      children: [
        // Title Page
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: {
            after: 600,
            before: 200,
          },
          children: [
            new TextRun({
              text: `TOP DOWN ANALYSIS REPORT`,
              bold: true,
              size: 36,
              color: "2E5BBA",
            }),
          ],
        }),

        // Subtitle
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 800 },
          children: [
            new TextRun({
              text: `Professional Trading Analysis`,
              size: 20,
              color: "666666",
              italics: true,
            }),
          ],
        }),

        // Analysis Header Information Table
        new Table({
          width: {
            size: 100,
            type: WidthType.PERCENTAGE,
          },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: {
                    size: 50,
                    type: WidthType.PERCENTAGE,
                  },
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: "Currency Pair: ",
              bold: true,
              size: 24,
                          color: "2E5BBA",
            }),
            new TextRun({
              text: analysis.currency_pair,
              size: 24,
                          bold: true,
                        }),
                      ],
            }),
          ],
                }),
                new TableCell({
                  width: {
                    size: 50,
                    type: WidthType.PERCENTAGE,
                  },
                  children: [
        new Paragraph({
          children: [
            new TextRun({
                          text: "Analyst: ",
              bold: true,
              size: 24,
                          color: "2E5BBA",
            }),
            new TextRun({
              text: analystName,
              size: 24,
                          bold: true,
                        }),
                      ],
                    }),
                  ],
            }),
          ],
        }),
            new TableRow({
              children: [
                new TableCell({
                  children: [
        new Paragraph({
          children: [
            new TextRun({
                          text: "Analysis Date: ",
              bold: true,
              size: 24,
                          color: "2E5BBA",
            }),
            new TextRun({
              text: analysis.analysis_date ? 
                format(new Date(analysis.analysis_date), 'EEEE, MMMM do, yyyy') :
                format(new Date(analysis.created_at), 'EEEE, MMMM do, yyyy'),
              size: 24,
            }),
          ],
                    }),
                  ],
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: "Status: ",
                          bold: true,
                          size: 24,
                          color: "2E5BBA",
                        }),
                        new TextRun({
                          text: analysis.status,
                          size: 24,
                          color: analysis.status === 'COMPLETED' ? "28A745" : "FFC107",
                          bold: true,
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          ],
          borders: {
            top: { style: BorderStyle.SINGLE, size: 2, color: "2E5BBA" },
            bottom: { style: BorderStyle.SINGLE, size: 2, color: "2E5BBA" },
            left: { style: BorderStyle.SINGLE, size: 2, color: "2E5BBA" },
            right: { style: BorderStyle.SINGLE, size: 2, color: "2E5BBA" },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
            insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
          },
        }),

        new Paragraph({
          text: "",
          spacing: { after: 400 },
        }),

        // Executive Summary
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 300, before: 400 },
          children: [
            new TextRun({
              text: "EXECUTIVE SUMMARY",
              bold: true,
              size: 28,
              color: "2E5BBA",
            }),
          ],
            }),

        new Paragraph({
          spacing: { after: 300 },
          children: [
            new TextRun({
              text: `This Top Down Analysis provides a comprehensive evaluation of ${analysis.currency_pair} across multiple timeframes, incorporating technical analysis, market structure assessment, and economic event considerations. The analysis was conducted on ${analysis.analysis_date ? format(new Date(analysis.analysis_date), 'MMMM do, yyyy') : format(new Date(analysis.created_at), 'MMMM do, yyyy')} by ${analystName}.`,
              size: 24,
            }),
          ],
        }),

        // Timeframe Analysis Section
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 300, before: 400 },
          children: [
            new TextRun({
              text: "TIMEFRAME ANALYSIS",
              bold: true,
              size: 28,
              color: "2E5BBA",
            }),
          ],
        }),

        // Group questions by timeframe and create detailed sections
        ...(() => {
          const questionsByTimeframe = questions.reduce((acc: Record<string, TDAQuestion[]>, question: TDAQuestion) => {
            if (!acc[question.timeframe]) acc[question.timeframe] = [];
            acc[question.timeframe].push(question);
            return acc;
          }, {});

          return Object.entries(questionsByTimeframe).flatMap(([timeframe, timeframeQuestions]: [string, TDAQuestion[]]) => {
            const timeframeAnswers = answers.filter((a: TDAAnswer) => 
              timeframeQuestions.some((q: TDAQuestion) => q.id === a.question_id)
            );

            if (timeframeAnswers.length === 0) return [];

            const timeframeLabels: Record<string, string> = {
              'DAILY': 'Daily Timeframe Analysis',
              'H1': '1-Hour Timeframe Analysis', 
              'M15': '15-Minute Timeframe Analysis'
            };

                         return [
               new Paragraph({
                 heading: HeadingLevel.HEADING_3,
                 spacing: { after: 200, before: 300 },
                 children: [
                   new TextRun({
                     text: timeframeLabels[timeframe] || `${timeframe} Analysis`,
                     bold: true,
                     size: 26,
                     color: "4A90E2",
                   }),
                 ],
               }),

              // Create table for questions and answers
          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE,
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                        width: {
                          size: 40,
                          type: WidthType.PERCENTAGE,
                        },
                        children: [
                          new Paragraph({
                children: [
                              new TextRun({
                                text: "Question",
                                bold: true,
                                size: 24,
                                color: "2E5BBA",
                  }),
                ],
              }),
            ],
                      }),
                      new TableCell({
                        width: {
                          size: 60,
                          type: WidthType.PERCENTAGE,
                        },
                        children: [
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: "Answer",
                                bold: true,
                                size: 24,
                                color: "2E5BBA",
                              }),
                            ],
                      }),
                        ],
                      }),
                    ],
                  }),
                  ...timeframeQuestions.map((question: TDAQuestion) => {
                    const answer = timeframeAnswers.find((a: TDAAnswer) => a.question_id === question.id);
                    return new TableRow({
                      children: [
                      new TableCell({
                           children: [
                             new Paragraph({
                               spacing: { after: 200 },
                               children: [
                                 new TextRun({
                                   text: question.question_text,
                                   size: 22,
                                   bold: true,
                      }),
                  ],
                }),
              ],
                         }),
                         new TableCell({
                           children: [
            new Paragraph({
              spacing: { after: 200 },
                children: [
                  new TextRun({
                                   text: answer ? (String(answer.answer_text || answer.answer_value || 'No answer provided')) : 'No answer provided',
                                   size: 22,
                  }),
                               ],
                             }),
                           ],
                         }),
                      ],
                    });
                  }),
                ],
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                  bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                  left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                  right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                  insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                  insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                },
              }),

              new Paragraph({
                text: "",
                spacing: { after: 400 },
              }),
            ];
          });
        })(),

                 // Economic Announcements Section
         ...(announcements && announcements.length > 0 ? [
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 300, before: 400 },
             children: [
               new TextRun({
                 text: "ECONOMIC ANNOUNCEMENTS",
                 bold: true,
                 size: 28,
                 color: "2E5BBA",
               }),
             ],
          }),

          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE,
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "Announcement Type",
                            bold: true,
                            size: 24,
                            color: "2E5BBA",
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "Time",
                            bold: true,
                            size: 24,
                            color: "2E5BBA",
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "Impact",
                            bold: true,
                            size: 24,
                            color: "2E5BBA",
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              ...announcements.map(announcement => 
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: announcement.announcement_type, size: 22 })] })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: announcement.time, size: 22 })] })],
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({ 
                          children: [
                            new TextRun({ 
                              text: announcement.impact, 
                              size: 22,
                              color: announcement.impact === 'HIGH' ? "DC3545" : announcement.impact === 'MEDIUM' ? "FFC107" : "28A745",
                              bold: true,
                            })
                          ] 
                        })
                      ],
                    }),
                  ],
                })
              ),
            ],
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
              right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
              insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
            },
          }),
        ] : []),

                 // AI Analysis Section
         ...(analysis.ai_summary || analysis.ai_reasoning ? [
           new Paragraph({
             heading: HeadingLevel.HEADING_2,
             spacing: { after: 300, before: 400 },
             children: [
               new TextRun({
                 text: "AI ANALYSIS",
                 bold: true,
                 size: 28,
                 color: "2E5BBA",
               }),
             ],
           }),

           ...(analysis.ai_summary ? [
             new Paragraph({
               heading: HeadingLevel.HEADING_3,
               spacing: { after: 200, before: 300 },
               children: [
                 new TextRun({
                   text: "AI Summary",
                   bold: true,
                   size: 26,
                   color: "4A90E2",
                 }),
               ],
             }),
             new Paragraph({
               spacing: { after: 300 },
               children: [
                 new TextRun({
                   text: analysis.ai_summary,
                   size: 24,
                 }),
               ],
             }),
           ] : []),

           ...(analysis.ai_reasoning ? [
             new Paragraph({
               heading: HeadingLevel.HEADING_3,
               spacing: { after: 200, before: 300 },
               children: [
                 new TextRun({
                   text: "AI Detailed Reasoning",
                   bold: true,
                   size: 26,
                   color: "4A90E2",
                 }),
               ],
             }),
             new Paragraph({
               spacing: { after: 300 },
               children: [
                 new TextRun({
                   text: analysis.ai_reasoning,
                   size: 24,
                 }),
               ],
             }),
           ] : []),
         ] : []),

                 // Notes Section
        ...(analysis.notes ? [
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 300, before: 400 },
             children: [
               new TextRun({
                 text: "ADDITIONAL NOTES",
                 bold: true,
                 size: 28,
                 color: "2E5BBA",
               }),
             ],
          }),
          new Paragraph({
             spacing: { after: 300 },
             children: [
               new TextRun({
            text: analysis.notes,
                 size: 24,
               }),
             ],
          }),
        ] : []),

         // Tags Section
        ...(analysis.tags && analysis.tags.length > 0 ? [
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 300, before: 400 },
             children: [
               new TextRun({
                 text: "ANALYSIS TAGS",
                 bold: true,
                 size: 28,
                 color: "2E5BBA",
               }),
             ],
          }),
          new Paragraph({
             spacing: { after: 300 },
             children: [
               new TextRun({
            text: analysis.tags.join(', '),
                 size: 24,
               }),
             ],
          }),
        ] : []),

        // Footer
        new Paragraph({
           spacing: { after: 400, before: 400 },
         }),
         new Paragraph({
           alignment: AlignmentType.CENTER,
           spacing: { after: 200 },
           children: [
             new TextRun({
               text: `Report generated on ${format(new Date(), 'EEEE, MMMM do, yyyy at HH:mm')}`,
               size: 20,
               color: "666666",
               italics: true,
             }),
           ],
         }),
         new Paragraph({
          alignment: AlignmentType.CENTER,
           spacing: { after: 200 },
           children: [
             new TextRun({
               text: `Generated by ${analystName} - Top Down Analysis System`,
               size: 18,
               color: "999999",
             }),
           ],
        }),
      ],
    }],
  });

  // Generate document
  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

export function downloadTDAAsWord(data: TDADocumentData, fileName: string): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const buffer = await generateTDAWordDocument(data);
      
      // Create blob and download
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      resolve();
    } catch (error) {
      console.error('Word export error:', error);
      reject(new Error('Failed to generate Word document. Please try again.'));
    }
  });
} 
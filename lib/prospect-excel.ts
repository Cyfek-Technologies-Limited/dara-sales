import ExcelJS from 'exceljs'
import type { AdminLead } from '@/components/admin-leads-list'

export async function buildProspectWorkbook(leads: AdminLead[], organization: string, scope: string) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Dara'
  workbook.created = new Date()
  const sheet = workbook.addWorksheet('Businesses', { views: [{ state: 'frozen', ySplit: 5 }] })
  const columns = [
    ['Business',36],['Email',32],['Phone',24],['Status',18],['Response',48],
    ['Industry',30],['Category',30],['Website',40],['Contact person',26],
    ['Assigned teammate',26],['Teammate email',30],['Notes',48],['Sources',65],
    ['Created (UTC)',23],['Updated (UTC)',23],
  ] as const
  sheet.columns=columns.map(([,width])=>({width}))
  sheet.mergeCells('A1:O1'); sheet.getCell('A1').value=`${organization} — Businesses`
  sheet.getCell('A1').font={size:18,bold:true,color:{argb:'FF0B1F3A'}}; sheet.getRow(1).height=32
  sheet.mergeCells('A2:O2'); sheet.getCell('A2').value=`${scope} · ${leads.length} businesses · Exported ${new Date().toISOString()}`
  sheet.getCell('A2').font={size:10,color:{argb:'FF657286'}}
  sheet.mergeCells('A3:O3'); sheet.getCell('A3').value='Blank contact fields indicate that no contact was saved. Source links are retained for review.'
  sheet.getCell('A3').font={size:10,color:{argb:'FF657286'}}
  const labels: Record<string,string>={PROSPECT:'Prospect',CONTACTED:'Contacted',ACCEPTED:'Accepted',REJECTED:'Rejected',RESPONSE:'Response'}
  const text=(value: string | null) => (value || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').slice(0,32767)
  const date=(value: string) => Number.isNaN(Date.parse(value))?null:new Date(value)
  sheet.addTable({name:'Businesses',ref:'A5',headerRow:true,style:{theme:'TableStyleMedium2',showRowStripes:true},
    columns:columns.map(([name])=>({name,filterButton:true})),
    rows:leads.map(lead=>[
      text(lead.businessName),text(lead.email),text(lead.phone),labels[lead.contactStatus] || lead.contactStatus,
      text(lead.responseText),text(lead.industry),text(lead.categoryName),text(lead.website),text(lead.contactName),
      text(lead.ownerName),text(lead.ownerEmail),text(lead.notes),text(lead.source),date(lead.createdAt),date(lead.updatedAt),
    ])})
  sheet.getRow(5).height=24
  for(let row=6;row<=leads.length+5;row++) {
    sheet.getRow(row).height=42
    sheet.getRow(row).alignment={vertical:'top',wrapText:true}
    // Strings stay strings: preserve phone prefixes and prevent formula execution.
    sheet.getCell(row,3).numFmt='@'
    sheet.getCell(row,14).numFmt='yyyy-mm-dd hh:mm'
    sheet.getCell(row,15).numFmt='yyyy-mm-dd hh:mm'
  }
  sheet.pageSetup={orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0,printTitlesRow:'1:5'}
  return workbook.xlsx.writeBuffer()
}

"""Gera revisão A4 com as capturas sintéticas da ficha em modo de teste.
Requer ReportLab; executar depois de playwright.workflow.config.ts.
"""
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.utils import ImageReader

root = Path(__file__).resolve().parents[2]
out = root / 'output/workflow-integration'
w, h = landscape(A4)
pdf = canvas.Canvas(str(out / 'carina-ficha-cinco-grupos-a4.pdf'), pagesize=(w, h))
pdf.setTitle('Carina — revisão da ficha em cinco grupos')
for theme in ('light', 'dark'):
    pdf.setFont('Helvetica-Bold', 18)
    pdf.drawString(28, h - 34, 'Carina — ficha real em cinco grupos')
    pdf.setFont('Helvetica', 10)
    pdf.drawString(28, h - 52, 'Resumo | Dados | Trabalho | Contratos | Financeiro e documentos')
    pdf.drawString(28, h - 70, 'Modo de teste; dados fictícios. Claro' if theme == 'light' else 'Modo de teste; dados fictícios. Escuro')
    for project, x, width in (('desktop', 28, 540), ('iphone', 595, 210)):
        path = out / f'{project}-finance-{theme}.png'
        image = ImageReader(str(path))
        iw, ih = image.getSize()
        scale = min(width / iw, (h - 130) / ih)
        pdf.drawImage(image, x, h - 98 - ih * scale, iw * scale, ih * scale)
    pdf.setFont('Helvetica', 9)
    pdf.drawString(28, 33, 'Painéis e formulários existentes reutilizados; sem publicação ou operações em dados reais.')
    pdf.drawString(28, 19, 'Integrações reais e Safari/iPhone físico por validar. Este PDF é uma revisão visual, sem funcionalidades interactivas.')
    pdf.showPage()
pdf.save()
print(out / 'carina-ficha-cinco-grupos-a4.pdf')

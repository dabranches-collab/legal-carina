"""Gera PDFs de revisão A4 horizontal a partir do inventário e capturas locais."""
from pathlib import Path
import json
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.lib.utils import ImageReader
from xml.sax.saxutils import escape
root=Path(__file__).resolve().parents[2]
out=root/'output/workflow-review'; shots=root/'output/workflow-qa/screenshots'
styles=getSampleStyleSheet(); styles['Normal'].fontSize=10; styles['Normal'].leading=14
styles['Heading1'].textColor=colors.HexColor('#163148')
W,H=landscape(A4)
def p(s,style='Normal'): return Paragraph(escape(s),styles[style])
def footer(c,d):
 c.setFont('Helvetica',8);c.drawString(28,18,'CARINA | Preparação isolada | 09-10-2026 | Dados fictícios');c.drawRightString(W-28,18,str(d.page))
def doc(name,story):
 SimpleDocTemplate(str(out/name),pagesize=(W,H),rightMargin=28,leftMargin=28,topMargin=25,bottomMargin=32).build(story,onFirstPage=footer,onLaterPages=footer)
def pic(name,maxh=440):
 path=shots/name;iw,ih=ImageReader(str(path)).getSize();scale=min((W-56)/iw,maxh/ih);return Image(str(path),iw*scale,ih*scale)
s=[p('Simplificar o trabalho sem interromper os operadores','Title'),p('Pacote de revisão — protótipo 0.16.0-preview.2','Heading2'),p('Concluído: inventário de 84 funcionalidades, mapa de acessos, protótipo independente, formulários comuns e comparação dos percursos. A aplicação operacional não foi modificada.'),Spacer(1,15)]
rows=[['MENU','FUNÇÕES / ACESSO PROPOSTO'],['Resumo','Indicadores, sociedade, responsável e atalhos para o trabalho pendente.'],['Clientes','Lista única e ficha: Resumo → Dados → Trabalho → Contratos → Financeiro e documentos.'],['Trabalho','Registos e despesas; procurar, filtrar, criar e editar pelo mesmo formulário.'],['Financeiro','Por facturar → Notas de honorários → Facturas → Recebimentos. Provisões separadas.'],['Notas','Notas partilhadas, tarefas e responsáveis.'],['Definições (secundário)','Utilizadores, permissões, importações, tabelas e logs conforme perfil.']]
t=Table([[p(c) for c in row] for row in rows],colWidths=[135,W-191]);t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#e3e9ee')),('VALIGN',(0,0),(-1,-1),'TOP'),('BOTTOMPADDING',(0,0),(-1,-1),10)]));s += [t,Spacer(1,10),p('Tradutores: Financeiro → Nota → idioma PT/EN/FR → pré-visualização → PDF/Word → versão guardada/reimpressão. Na ficha: Financeiro e documentos → mesma emissão. Azure Translator real está mapeado; este protótipo usa traduções de exemplo.')]
s += [PageBreak(),p('Mapa mental — acesso simplificado','Title')]
branches=[('CLIENTE','Clientes → seleccionar ficha → cinco grupos'),('REGISTOS / DESPESAS','Trabalho → adicionar/editar; ficha → Trabalho → mesmo formulário'),('CONTRATOS','Clientes → ficha → Contratos → avença / preço fixo → registos associados'),('DOCUMENTOS / TRADUÇÃO','Financeiro → notas → PT/EN/FR → pré-visualizar → PDF/Word → versões'),('FACTURAÇÃO / PAGAMENTOS','Financeiro → quatro filas → abrir documento → receber total/parcial'),('PROVISÕES / ARQUIVO','Ficha → Financeiro e documentos → provisões, documentos e credenciais'),('EQUIPA / ADMINISTRAÇÃO','Notas → tarefas; Definições → configuração por perfil')]
for a,b in branches:s += [p('CARINA → '+a,'Heading2'),p(b)]
s += [p('As 84 entradas individuais, com origem e ligação actual/proposta, encontram-se no PDF do inventário. Demonstrado não significa integração real validada.')]
for title,name in [('Resumo e navegação','desktop-Resumo-light.png'),('Ficha: financeiro e documentos','desktop-cliente-Financeiro-e-documentos-light.png'),('Contratos e trabalho associado','desktop-cliente-Contratos-light.png'),('Tradução de exemplo e emissão','desktop-traducao-fr.png')]:
 s += [PageBreak(),p(title,'Heading1'),pic(name)]
s += [PageBreak(),p('Validação e passagem segura para operação','Title'),p('40 cenários do protótipo passaram em desktop, tablet e iPhone emulado vertical/horizontal. 303 testes unitários existentes passaram; segurança, lint, tipos e builds aprovados. PDF e Word franceses verificados.'),Spacer(1,12),p('O que está preparado','Heading2'),p('58 funcionalidades parcialmente demonstradas, 25 mapeadas e uma em preparação. Componentes e plano de reutilização dos módulos actuais documentados. Formulários com contexto do cliente, regresso e filtros preservados. Nove caixas e três grupos de gráficos abrem listas com pré-filtros e contagens coerentes. Voltar mantém a selecção global. Todos os dados do protótipo são fictícios e desaparecem ao recarregar.'),p('O que falta antes de activar','Heading2'),p('Revisão com operadores e teste físico em Safari/iPhone; ligar módulos e integrações existentes; validar permissões e regras financeiras no servidor; activar por fases após validação. Não foi efectuado deploy, migração ou alteração de dados reais.'),p('Limites desta entrega','Heading2'),p('Tradutor Azure, autenticação, arquivos e perfis são mapeados ou simulados, sem ensaio real. Testes SQL não executados por dependência local ausente. HTML autónomo verificado via servidor local; file:// bloqueado pela política do navegador deste ambiente. O PDF abre para leitura no iPhone; o HTML depende de navegador/servidor compatível.'),p('Percurso do operador','Heading2'),p('Manter os acessos habituais durante a transição. Rever primeiro registo, despesa, nota traduzida, factura, recebimento parcial, provisão, avença e preço fixo. A proposta compara passos; os tempos reais de execução ainda não foram medidos.')]
doc('carina-revisao-workflow-a4-horizontal.pdf',s)
features=json.loads((out/'inventory.json').read_text()); small=styles['BodyText'];small.fontSize=7;small.leading=9
rows=[[Paragraph(c,small) for c in ['ID / função','Acesso actual','Acesso proposto','Integração / estado']]]
for f in features:rows.append([Paragraph(escape(v),small) for v in [f['id']+' — '+f['name'],f['current'],f['proposed'],f['integration']+' / '+f['status']]])
t=Table(rows,colWidths=[170,200,240,W-666],repeatRows=1);t.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('BACKGROUND',(0,0),(-1,0),colors.HexColor('#e3e9ee')),('GRID',(0,0),(-1,-1),0.25,colors.HexColor('#cad3db')),('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6)]))
doc('carina-inventario-84-funcoes-a4-horizontal.pdf',[p('84 funcionalidades — acessos actuais e propostos','Title'),p('Demonstrado = exemplo parcial fictício; Mapeado = destino documentado; Em preparação = ainda por completar. Integrações reais não foram exercitadas.'),Spacer(1,10),t])
print('PDFs de revisão gerados')
from reportlab.pdfgen import canvas
from reportlab.lib.utils import simpleSplit
c=canvas.Canvas(str(out/'carina-mapa-mental-a4-horizontal.pdf'),pagesize=(W,H))
c.setFillColor(colors.HexColor('#163148'));c.setFont('Helvetica-Bold',20);c.drawString(28,H-38,'CARINA — mapa de acessos proposto')
c.setFont('Helvetica',10);c.drawString(28,H-56,'Cinco menus principais • ficha única • formulários comuns • integrações preservadas no plano')
def box(x,y,w,h,title,lines):
 c.setFillColor(colors.HexColor('#edf2f6'));c.setStrokeColor(colors.HexColor('#c2a05c'));c.roundRect(x,y,w,h,8,fill=1,stroke=1)
 c.setFillColor(colors.HexColor('#163148'));c.setFont('Helvetica-Bold',12);c.drawString(x+10,y+h-20,title)
 c.setFont('Helvetica',9);yy=y+h-36
 for line in lines:
  for sub in simpleSplit(line,'Helvetica',9,w-20):c.drawString(x+10,yy,sub);yy-=12
box(28,255,135,75,'CARINA',['Acesso pelo menu','ou pela ficha do cliente'])
items=[(440,'Resumo',['Indicadores → sociedade / responsável','Atalhos → trabalho pendente']),(345,'Clientes',['Lista única → ficha → Resumo / Dados','Trabalho / Contratos / Financeiro e documentos']),(250,'Trabalho',['Registos / despesas → criar / editar / exportar','Mesmo formulário global e na ficha']),(130,'Financeiro',['Por facturar → notas → facturas → recebimentos','Nota → idioma PT/EN/FR → pré-visualização','→ PDF / Word → versão / reimpressão','Provisões mantidas separadas']),(35,'Notas',['Notas partilhadas → tarefas / responsáveis'])]
for yy,title,lines in items:
 h=100 if title=='Financeiro' else 75
 c.setStrokeColor(colors.HexColor('#c2a05c'));c.line(163,292,200,292);c.line(200,292,200,yy+h/2);c.line(200,yy+h/2,225,yy+h/2);box(225,yy,365,h,title,lines)
box(615,340,195,175,'Ficha do cliente',['Resumo → indicadores e atalhos','Dados → contactos / identificação','Trabalho → registos / despesas','Contratos → avença / preço fixo','Financeiro e documentos → notas,','facturas, recebimentos, provisões,','documentos e credenciais'])
box(615,190,195,125,'Definições (secundário)',['Utilizadores / permissões','Tabelas / importações / logs','Acesso conforme o perfil','Autenticação e Face ID mantidos'])
box(615,45,195,125,'Preparação isolada',['84 funções inventariadas','Integrações reais por validar','Tradutor Azure apenas simulado','Revisão com operadores e','iPhone físico antes de activar'])
footer(c,type('D',(),{'page':1})());c.save()

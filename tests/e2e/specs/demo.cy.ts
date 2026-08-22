describe('智售引擎竞赛 Demo', () => {
  beforeEach(() => {
    cy.visit('/architecture');
  });

  it('展示云端五模块、双 Agent 和统一代码库', () => {
    cy.contains('系统架构演示').should('be.visible');
    cy.contains('大模型 API 网关').should('be.visible');
    cy.contains('Agent 工作流引擎').should('be.visible');
    cy.contains('行业知识引擎').should('be.visible');
    cy.contains('关系型数据库').should('be.visible');
    cy.contains('双 Agent 协同中心').should('be.visible');
    cy.contains('智店管家').should('be.visible');
    cy.contains('智购顾问').should('be.visible');
    cy.contains('全平台统一代码库').should('be.visible');
  });

  it('运行顾客问答后展示工作流和知识命中', () => {
    cy.contains('演示顾客问答').click();
    cy.contains('最近一次工作流').should('be.visible');
    cy.contains('水龙头怎么安装').should('be.visible');
    cy.contains('检索商品、文档与图谱').should('be.visible');
    cy.contains('知识命中').should('be.visible');
    cy.contains('智店管家已收到咨询').should('be.visible');
  });

  it('运行经营指令后展示协同调度结果', () => {
    cy.contains('演示经营指令').click();
    cy.contains('查胶带库存').should('be.visible');
    cy.contains('调度智店管家 Agent').should('be.visible');
    cy.contains('读取库存/报表数据').should('be.visible');
  });
});

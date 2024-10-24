import { BaseVisitor } from "./visitor.js";


export class FrameVisitor extends BaseVisitor{


    constructor(baseOffset){
        super()
        this.frame = []
        this.baseOffset = baseOffset
        this.localSize = 0
    }
    /**
     * @type {BaseVisitor['visitExpresion']}
     */
    visitExpresion(node) {
        
    }
    

    /**
     * @type {BaseVisitor['visitOperacionBinaria']}
     */
    visitOperacionBinaria(node) {
        
    }
    

    /**
     * @type {BaseVisitor['visitOperacionUnaria']}
     */
    visitOperacionUnaria(node) {
    }
    

    /**
     * @type {BaseVisitor['visitAgrupacion']}
     */
    visitAgrupacion(node) {
    }
    

    /**
     * @type {BaseVisitor['visitPrimitivo']}
     */
    visitPrimitivo(node) {
    }
    

    /**
     * @type {BaseVisitor['visitDeclaracionVariable']}
     */
    visitDeclaracionVariable(node) {
        this.frame.push({
            id: node.id,
            offset: this.baseOffset + this.localSize

        })
        this.localSize += 1
    }
    

    /**
     * @type {BaseVisitor['visitAccesoVariable']}
     */
    visitAccesoVariable(node) {
    }
    

    /**
     * @type {BaseVisitor['visitPrint']}
     */
    visitPrint(node) {
    }
    

    /**
     * @type {BaseVisitor['visitExpresionStmt']}
     */
    visitExpresionStmt(node) {
    }
    

    /**
     * @type {BaseVisitor['visitAsignacion']}
     */
    visitAsignacion(node) {
    }
    

    /**
     * @type {BaseVisitor['visitBloque']}
     */
    visitBloque(node) {
        node.dcls.forEach(dcl => dcl.accept(this))
    }
    

    /**
     * @type {BaseVisitor['visitIf']}
     */
    visitIf(node) {
        node.sentenciasTrue.accept(this)
        if(node.sentenciasFalse) node.sentenciasFalse.accept(this)
    }
    

    /**
     * @type {BaseVisitor['visitWhile']}
     */
    visitWhile(node) {
        node.sentencias.accept(this)
    }
    

    /**
     * @type {BaseVisitor['visitFor']}
     */
    visitFor(node) {
        node.sentencias.accept(this)
    }
    

    /**
     * @type {BaseVisitor['visitBreak']}
     */
    visitBreak(node) {
    }
    

    /**
     * @type {BaseVisitor['visitContinue']}
     */
    visitContinue(node) {
    }
    

    /**
     * @type {BaseVisitor['visitReturn']}
     */
    visitReturn(node) {
    }
    

    /**
     * @type {BaseVisitor['visitLlamada']}
     */
    visitLlamada(node) {
    }
    

    /**
     * @type {BaseVisitor['visitDeclaracionFuncion']}
     */
    visitDeclaracionFuncion(node) {
    }
    

    /**
     * @type {BaseVisitor['visitParam']}
     */
    visitParam(node) {
    }
    

    /**
     * @type {BaseVisitor['visitDeclaracionStruct']}
     */
    visitDeclaracionStruct(node) {
    }
    

    /**
     * @type {BaseVisitor['visitInstancia']}
     */
    visitInstancia(node) {
    }
    

    /**
     * @type {BaseVisitor['visitGet']}
     */
    visitGet(node) {
    }
    

    /**
     * @type {BaseVisitor['visitSet']}
     */
    visitSet(node) {
    }
    

    /**
     * @type {BaseVisitor['visitDeclaracionArreglo']}
     */
    visitDeclaracionArreglo(node) {
    }
    

    /**
     * @type {BaseVisitor['visitAccesoValorArreglo']}
     */
    visitAccesoValorArreglo(node) {
    }
    

    /**
     * @type {BaseVisitor['visitAsignacionValorArreglo']}
     */
    visitAsignacionValorArreglo(node) {
    }
    

    /**
     * @type {BaseVisitor['visitDeclaracionArregloReservado']}
     */
    visitDeclaracionArregloReservado(node) {
    }
    

    /**
     * @type {BaseVisitor['visitFuncParseInt']}
     */
    visitFuncParseInt(node) {
    }
    

    /**
     * @type {BaseVisitor['visitFuncParseFloat']}
     */
    visitFuncParseFloat(node) {
    }
    

    /**
     * @type {BaseVisitor['visitFuncToString']}
     */
    visitFuncToString(node) {
    }
    

    /**
     * @type {BaseVisitor['visitFuncToLowerCase']}
     */
    visitFuncToLowerCase(node) {
    }
    

    /**
     * @type {BaseVisitor['visitFuncToUpperCase']}
     */
    visitFuncToUpperCase(node) {
    }
    

    /**
     * @type {BaseVisitor['visitFuncTypeOf']}
     */
    visitFuncTypeOf(node) {
    }
    

    /**
     * @type {BaseVisitor['visitFuncIndexOf']}
     */
    visitFuncIndexOf(node) {
    }
    

    /**
     * @type {BaseVisitor['visitFuncJoin']}
     */
    visitFuncJoin(node) {
    }
    

    /**
     * @type {BaseVisitor['visitFuncLength']}
     */
    visitFuncLength(node) {
    }
    

    /**
     * @type {BaseVisitor['visitSwitch']}
     */
    visitSwitch(node) {
    }
    

    /**
     * @type {BaseVisitor['visitCase']}
     */
    visitCase(node) {
    }
    

    /**
     * @type {BaseVisitor['visitDefault']}
     */
    visitDefault(node) {
    }
}

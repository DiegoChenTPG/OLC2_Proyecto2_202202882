
import { registers as r, floatRegister as f } from "../risc/constantes.js";
import { Generador } from "../risc/generador.js";
import { BaseVisitor } from "./visitor.js";


export class CompilerVisitor extends BaseVisitor{
    constructor(){
        super()
        this.code = new Generador()

        this.continueLabel = null
        this.breakLabel = null
    }

    /**
    * @type {BaseVisitor['visitExpresionStmt']}
    */
    visitExpresionStmt(node){
        node.exp.accept(this)
        this.code.popObject(r.T0)
    }

    /**
    * @type {BaseVisitor['visitPrimitivo']}
    */
    visitPrimitivo(node){
        /*
        this.code.li(r.T0, node.valor)
        this.code.push()
        */
        this.code.comment(`Primitivo: ${node.valor}`)
        this.code.pushConstant({ type: node.tipo, valor: node.valor })
        this.code.comment(`Fin Primitivo: ${node.valor}`)

    }

    /**
    * @type {BaseVisitor['visitOperacionBinaria']}
    */
    visitOperacionBinaria(node){
        this.code.comment(`Operacion: ${node.op}`);


        if(node.op === "&&"){
            node.izq.accept(this) // izq
            this.code.popObject(r.T0) // izq

            const labelFalse = this.code.getLabel()
            const labelEnd = this.code.getLabel()

            this.code.beq(r.T0, r.ZERO, labelFalse) // if(!izq) goto labelFalse
            node.der.accept(this) // der 
            this.code.popObject(r.T0) // der
            this.code.beq(r.T0, r.ZERO, labelFalse) // if(!der) goto labelFalse

            this.code.li(r.T0, 1)
            this.code.push(r.T0)
            this.code.j(labelEnd)
            this.code.addLabel(labelFalse)
            this.code.li(r.T0, 0)
            this.code.push(r.T0)

            this.code.addLabel(labelEnd)
            this.code.pushObject({type: 'boolean', length: 4})
            return
        }

        if (node.op === "||") {
            node.izq.accept(this) // izq 
            this.code.popObject(r.T0) // izq

            const labelTrue = this.code.getLabel()
            const labelEnd = this.code.getLabel()

            this.code.bne(r.T0, r.ZERO, labelTrue) // if(izq) goto labelTrue
            node.der.accept(this) // der
            this.code.popObject(r.T0) // der
            this.code.bne(r.T0, r.ZERO, labelTrue) // if(der) goto labelTrue

            this.code.li(r.T0, 0)
            this.code.push(r.T0)

            this.code.j(labelEnd)
            this.code.addLabel(labelTrue)
            this.code.li(r.T0, 1)
            this.code.push(r.T0)

            this.code.addLabel(labelEnd)
            this.code.pushObject({type: 'boolean', length: 4})
            return        
        }
        node.izq.accept(this)
        node.der.accept(this)

        const isDerFloat = this.code.getTopObject().type === "float"
        const der = this.code.popObject(isDerFloat ? f.FT0 : r.T0)
        const isIzqFloat = this.code.getTopObject().type === "float"
        const izq = this.code.popObject(isIzqFloat ? f.FT1 : r.T1)
        
        if (izq.type === "string" && der.type === "string") {
            this.code.add(r.A0, r.ZERO, r.T1)
            this.code.add(r.A1, r.ZERO, r.T0)
            this.code.callBuiltin('concatString')
            this.code.pushObject({type: 'string', length: 4})
            return
        }

        if(isIzqFloat || isDerFloat) {
            if (!isIzqFloat) this.code.fcvtsw(f.FT1, r.T1)
            if (!isDerFloat) this.code.fcvtsw(f.FT0, r.T0)

            switch (node.op) {
                case "+":
                    this.code.fadd(f.FT0, f.FT1, f.FT0)
                    break

                case "-":
                    this.code.fsub(f.FT0, f.FT1, f.FT0)
                    break

                case "*":
                    this.code.fmul(f.FT0, f.FT1, f.FT0)
                    break

                case "/":
                    this.code.fdiv(f.FT0, f.FT1, f.FT0)
                    break
            }
            this.code.pushFloat(f.FT0)
            this.code.pushObject({type: 'float', length: 4})
            return
        }

        switch (node.op) {
            case "+":
                this.code.add(r.T0, r.T0, r.T1)
                this.code.push(r.T0)
                break
            case "-":
                this.code.sub(r.T0, r.T1, r.T0)
                this.code.push(r.T0)
                break
            case "*":
                this.code.mul(r.T0, r.T0, r.T1)
                this.code.push(r.T0)
                break
            case "/":
                this.code.div(r.T0, r.T1, r.T0)
                this.code.push(r.T0)
                break
            case "%":
                this.code.rem(r.T0, r.T1, r.T0)
                this.code.push(r.T0)
                break
            case "<=":
                this.code.callBuiltin("lessOrEqual")
                this.code.pushObject({type: 'boolean', length: 4})
                return
        }
        this.code.pushObject({ type: 'int', length: 4 })
    }

    /**
    * @type {BaseVisitor['visitOperacionUnaria']}
    */
    visitOperacionUnaria(node){
        node.exp.accept(this)

        this.code.popObject(r.T0)

        switch (node.op) {
            case "-":
                this.code.li(r.T1, 0)
                this.code.sub(r.T0, r.T1, r.T0)
                this.code.push(r.T0)
                this.code.pushObject({type: 'int', length: 4})
                break
        }
    }

    /**
    * @type {BaseVisitor['visitAgrupacion']}
    */
    visitAgrupacion(node){
        return node.exp.accept(this)
    }


    /**
    * @type {BaseVisitor['visitPrint']}
    */

    visitPrint(node){
        this.code.comment('Print')
        const valor = node.exp

        valor.forEach(exp => {
            exp.accept(this)
            /*
            this.code.pop(r.A0)
            this.code.printInt()
            */
            const isFloat = this.code.getTopObject().type === "float"

            const object = this.code.popObject(isFloat ? f.FA0 : r.A0)

            const tipoPrint = {
                'int': () => this.code.printInt(),
                'string': () => this.code.printString(),
                'float': () => this.code.printFloat()
            }
            tipoPrint[object.type]()

        })

    }

    /**
    * @type {BaseVisitor['visitDeclaracionVariable']}
    */
    visitDeclaracionVariable(node){
        this.code.comment(`Declaracion Variable: ${node.id}`)

        node.exp.accept(this)
        this.code.tagObject(node.id)

        this.code.comment(`Fin Declaracion Variable: ${node.id}`)
    }

    /**
    * @type {BaseVisitor['visitAsignacion']}
    */
    visitAsignacion(node){
        this.code.comment(`Asignacion Variable: ${node.id}`)

        node.asignacion.accept(this)
        const valorObjeto = this.code.popObject(r.T0)
        const [offset, variableObject] = this.code.getObject(node.id)

        this.code.addi(r.T1, r.SP, offset)
        this.code.sw(r.T0, r.T1)

        variableObject.type = valorObjeto.type

        this.code.push(r.T0)
        this.code.pushObject(valorObjeto)


        this.code.comment(`Fin Asignacion Variable: ${node.id}`)
    }

    /**
    * @type {BaseVisitor['visitAccesoVariable']}
    */
    visitAccesoVariable(node){
        this.code.comment(`Acceso Variable: ${node.id}`)

        const [offset, variableObject] = this.code.getObject(node.id)
        this.code.addi(r.T0, r.SP, offset)
        this.code.lw(r.T1, r.T0)
        this.code.push(r.T1)
        this.code.pushObject({... variableObject, id: undefined})

        this.code.comment(`Fin Acceso Variable: ${node.id}`)
    }

    /**
    * @type {BaseVisitor['visitBloque']}
    */
    visitBloque(node){
        this.code.comment("Inicio de bloque")

        this.code.newScope()

        node.dcls.forEach(d => {d.accept(this)})

        this.code.comment("Reduciendo la pila")
        const bytesToRemove = this.code.endScope()

        if(bytesToRemove > 0){
            this.code.addi(r.SP, r.SP, bytesToRemove)
        }
        this.code.comment("Fin de bloque")
    }


    /**
    * @type {BaseVisitor['visitIf']}
    */
    visitIf(node){
        this.code.comment("Inicio del If")

        this.code.comment("Condicion")
        node.condicion.accept(this)

        this.code.popObject(r.T0)

        this.code.comment("Fin de condicion")

        const hasElse = !!node.sentenciasFalse

        if(hasElse) {
            const elseLabel = this.code.getLabel()
            const endIfLabel = this.code.getLabel()

            this.code.beq(r.T0, r.ZERO, elseLabel)
            this.code.comment("Rama verdadera")
            node.sentenciasTrue.accept(this)
            this.code.j(endIfLabel)
            this.code.addLabel(elseLabel)
            this.code.comment("Rama falsa")
            node.sentenciasFalse.accept(this)
            this.code.addLabel(endIfLabel)
        } else {
            const endIfLabel = this.code.getLabel()

            this.code.beq(r.T0, r.ZERO, endIfLabel)
            this.code.comment("Rama verdadera")
            node.sentenciasTrue.accept(this)
            this.code.addLabel(endIfLabel)
        }

        this.code.comment("Fin del If")
    }



    /**
    * @type {BaseVisitor['visitWhile']}
    */
    visitWhile(node){   

        const startWhileLabel = this.code.getLabel()
        const prevContinueLabel = this.continueLabel
        this.continueLabel = startWhileLabel

        const endWhileLabel = this.code.getLabel()
        const prevBreakLabel = this.breakLabel
        this.breakLabel = endWhileLabel

        this.code.addLabel(startWhileLabel)
        this.code.comment("Condicion")
        node.condicion.accept(this)
        this.code.popObject(r.T0)
        this.code.comment("Fin de condicion")
        this.code.beq(r.T0, r.ZERO, endWhileLabel)
        this.code.comment("Cuerpo del while")
        node.sentencias.accept(this)
        this.code.j(startWhileLabel)
        this.code.addLabel(endWhileLabel)

        this.continueLabel = prevContinueLabel
        this.breakLabel = prevBreakLabel

    }

    /**
     * @type {BaseVisitor['visitFor']}
     */
    visitFor(node){
        
        this.code.comment("For")

        const startForLabel = this.code.getLabel()

        const endForLabel = this.code.getLabel()
        const prevBreakLabel = this.breakLabel
        this.breakLabel = endForLabel

        const incrementLabel = this.code.getLabel()
        const prevContinueLabel = this.continueLabel
        this.continueLabel = incrementLabel

        this.code.newScope() // nuevo entorno

        node.inicializacion.accept(this)

        this.code.addLabel(startForLabel)
        this.code.comment("Condicion")
        node.condicion.accept(this)
        this.code.popObject(r.T0)
        this.code.comment("Fin de la condicion")
        this.code.beq(r.T0, r.ZERO, endForLabel)

        this.code.comment("Cuerpo del For")
        node.sentencias.accept(this)

        this.code.addLabel(incrementLabel)
        node.actualizacion.accept(this)
        this.code.popObject(r.T0)
        this.code.j(startForLabel)

        this.code.addLabel(endForLabel)

        this.code.comment("Reduciendo la pila")
        const bytesToRemove = this.code.endScope()

        if(bytesToRemove > 0){
            this.code.addi(r.SP, r.SP, bytesToRemove)

        }

        this.continueLabel = prevContinueLabel
        this.breakLabel = prevBreakLabel

        this.code.comment("Fin del For")

    }


    /**
     * @type {BaseVisitor['visitBreak']}
     */
    visitBreak(node){
        this.code.j(this.breakLabel)
    }

    /**
     * @type {BaseVisitor['visitContinue']}
     */
    visitContinue(node){
        this.code.j(this.continueLabel)
    }
}

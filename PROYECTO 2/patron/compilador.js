
import { registers as r, floatRegister as f } from "../risc/constantes.js";
import { Generador } from "../risc/generador.js";
import { FrameVisitor } from "./frame.js";
import { AccesoVariable } from "./nodos.js";
import { BaseVisitor } from "./visitor.js";


export class CompilerVisitor extends BaseVisitor {
    constructor() {
        super()
        this.code = new Generador()

        this.continueLabel = null
        this.breakLabel = null

        this.functionMetada = {}
        this.insideFunction = false
        this.frameDclIndex = 0
        this.returnLabel = null
    }

    /**
    * @type {BaseVisitor['visitExpresionStmt']}
    */
    visitExpresionStmt(node) {
        node.exp.accept(this)
        this.code.popObject(r.T0)
    }

    /**
    * @type {BaseVisitor['visitPrimitivo']}
    */
    visitPrimitivo(node) {
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
    visitOperacionBinaria(node) {
        this.code.comment(`Operacion: ${node.op}`);

        if (node.op === "&&") {
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
            this.code.pushObject({ type: 'boolean', length: 4 })
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
            this.code.pushObject({ type: 'boolean', length: 4 })
            return
        }

        node.izq.accept(this)
        node.der.accept(this)

        const isDerFloat = this.code.getTopObject().type === "float"
        const der = this.code.popObject(isDerFloat ? f.FT0 : r.T0)
        const isIzqFloat = this.code.getTopObject().type === "float"
        const izq = this.code.popObject(isIzqFloat ? f.FT1 : r.T1)

        /*
        if (izq.type === "string" && der.type === "string") {
            this.code.add(r.A0, r.ZERO, r.T1)
            this.code.add(r.A1, r.ZERO, r.T0)
            this.code.callBuiltin('concatString')
            this.code.pushObject({ type: 'string', length: 4 })
            return
        }
        */

        //MODIFICACION PARA MANEJO DE  suma de char y string 
        if (node.op === "+") {
            // Si ambos son char
            if (izq.type === "char" && der.type === "char") {
                this.code.add(r.T0, r.T0, r.T1)
                this.code.push(r.T0)
                this.code.pushObject({ type: 'int', length: 4 })
                return
            }

            // Si al menos uno es string o es una mezcla de char y string
            if (izq.type === "string" || izq.type === "char" || der.type === "string" || der.type === "char") {
                console.log("ENTRAMOS ACA AL SEGUNDO IF")
                console.log("izq " + izq.type)
                console.log("der  " + der.type)

                this.code.add(r.T2, r.ZERO, r.T1)  // Guardar izquierdo en T2 NEW
                this.code.add(r.T3, r.ZERO, r.T0)  // Guardar derecho en T3 NEW

                // Convertir izquierdo si es char
                if (izq.type === "char") {
                    this.code.add(r.A0, r.ZERO, r.T2)  // Poner char en A0
                    this.code.callBuiltin('charToString')  // Convertir a string
                    this.code.add(r.T2, r.ZERO, r.A0)  // Guardar resultado en T2
                }

                // Convertir derecho si es char
                if (der.type === "char") {
                    this.code.add(r.A0, r.ZERO, r.T3)  // Poner char en A0
                    this.code.callBuiltin('charToString')  // Convertir a string
                    this.code.add(r.T3, r.ZERO, r.A0)  // Guardar resultado en T3
                }

                //Concatenacion
                this.code.add(r.A0, r.ZERO, r.T2)
                this.code.add(r.A1, r.ZERO, r.T3)

                this.code.callBuiltin('concatString')
                this.code.pushObject({ type: 'string', length: 4 })
                return
            }
        }

        // Manejo del resto de operaciones con string
        if (izq.type === "string" && der.type === "string") {
            if (node.op === "==" || node.op === "!=") {
                this.code.add(r.A0, r.ZERO, r.T1)
                this.code.add(r.A1, r.ZERO, r.T0)
                this.code.callBuiltin('compareString')
                
                this.code.add(r.T0, r.A0, r.ZERO)
                if (node.op === "!=") {
                    this.code.xori(r.T0, r.T0, 1)
                }
                this.code.push(r.T0)
                this.code.pushObject({ type: 'boolean', length: 4 })
                return
            }
        }

        // Manejo del resto de operaciones con char
        if (izq.type === "char" && der.type === "char") {
            switch (node.op) {
                case "==":
                    this.code.callBuiltin("equal")
                    this.code.pushObject({ type: 'boolean', length: 4 })
                    return
                case "!=":
                    this.code.callBuiltin("notEqual")
                    this.code.pushObject({ type: 'boolean', length: 4 })
                    return
                case "<":
                    this.code.callBuiltin("lessThan")
                    this.code.pushObject({ type: 'boolean', length: 4 })
                    return
                case "<=":
                    this.code.callBuiltin("lessOrEqual")
                    this.code.pushObject({ type: 'boolean', length: 4 })
                    return
                case ">":
                    this.code.callBuiltin("greaterThan")
                    this.code.pushObject({ type: 'boolean', length: 4 })
                    return
                case ">=":
                    this.code.callBuiltin("greaterOrEqual")
                    this.code.pushObject({ type: 'boolean', length: 4 })
                    return
            }   
        }  
        
        
        if (isIzqFloat || isDerFloat) {
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
                case "==":
                    this.code.feq(f.FT1, f.FT0)  
                    this.code.push(r.A0)
                    this.code.pushObject({ type: 'boolean', length: 4 })
                    return
                case "!=":
                    this.code.feq(f.FT1, f.FT0)  
                    this.code.xori(r.A0, r.A0, 1) 
                    this.code.push(r.A0)
                    this.code.pushObject({ type: 'boolean', length: 4 })
                    return
                case "<":
                    this.code.flt(f.FT1, f.FT0)
                    this.code.push(r.A0)
                    this.code.pushObject({ type: 'boolean', length: 4 })
                    return
                case "<=":
                    this.code.fle(f.FT1, f.FT0)
                    this.code.push(r.A0)
                    this.code.pushObject({ type: 'boolean', length: 4 })
                    return
                case ">":
                    this.code.flt(f.FT0, f.FT1)
                    this.code.push(r.A0)
                    this.code.pushObject({ type: 'boolean', length: 4 })
                    return
                case ">=":
                    this.code.fle(f.FT0, f.FT1)
                    this.code.push(r.A0)
                    this.code.pushObject({ type: 'boolean', length: 4 })
                    return
            }
            this.code.pushFloat(f.FT0)
            this.code.pushObject({ type: 'float', length: 4 })
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
                const divEndLabel = this.code.getLabel()
                const divErrorLabel = this.code.getLabel()
                this.code.beq(r.T0, r.ZERO, divErrorLabel) // Verificar si el denominador es cero

                // Si no es cero, se ejecuta la division normal
                this.code.div(r.T0, r.T1, r.T0)
                this.code.push(r.T0)
                this.code.j(divEndLabel)

                this.code.addLabel(divErrorLabel)
                // Imprimir mensaje de error
                this.code.printStringLiteral("Error: Division by zero\n")
                // Pushear null (usando -1 como representación de null)
                this.code.li(r.T0, -1)
                this.code.push(r.T0)
                
                this.code.addLabel(divEndLabel)

                break
            case "%":
                this.code.rem(r.T0, r.T1, r.T0)
                this.code.push(r.T0)
                break
            case "<=":
                this.code.callBuiltin("lessOrEqual")
                this.code.pushObject({ type: 'boolean', length: 4 })
                return
            case "==":
                this.code.callBuiltin("equal")
                this.code.pushObject({ type: 'boolean', length: 4 })
                return
            case "!=":
                this.code.callBuiltin("notEqual")
                this.code.pushObject({ type: 'boolean', length: 4 })
                return
            case ">=":
                this.code.callBuiltin("greaterOrEqual")
                this.code.pushObject({ type: 'boolean', length: 4 })
                return
            case ">":
                this.code.callBuiltin("greaterThan")
                this.code.pushObject({ type: 'boolean', length: 4 })
                return
            case "<":
                this.code.callBuiltin("lessThan")
                this.code.pushObject({ type: 'boolean', length: 4 })
                return
        }
        this.code.pushObject({ type: 'int', length: 4 })
    }

    /**
    * @type {BaseVisitor['visitOperacionUnaria']}
    */
    visitOperacionUnaria(node) {
        node.exp.accept(this)
        const isFloat = this.code.getTopObject().type === "float"
        const valor = this.code.popObject(isFloat ? f.FT0 : r.T0)


        //Manejo de la unaria para flotatnes
        if (isFloat) {
            this.code.li(r.T1, 0) // Cargar 0 en FT1
            this.code.fcvtsw(f.FT1, r.T1)
            this.code.fsub(f.FT0, f.FT1, f.FT0) // Negar el valor: 0 - valor

            // Empujar el resultado al stack
            this.code.pushFloat(f.FT0)
            this.code.pushObject({ type: 'float', length: 4 })

        } else {
            switch (node.op) {
                case "-":
                    this.code.li(r.T1, 0)
                    this.code.sub(r.T0, r.T1, r.T0)
                    this.code.push(r.T0)
                    this.code.pushObject({ type: 'int', length: 4 })
                    break
            }
        }

    }

    /**
    * @type {BaseVisitor['visitAgrupacion']}
    */
    visitAgrupacion(node) {
        return node.exp.accept(this)
    }


    /**
    * @type {BaseVisitor['visitPrint']}
    */

    visitPrint(node) {
        this.code.comment('Print')
        const valor = node.exp

        valor.forEach((exp, index) => {
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
                'float': () => this.code.printFloat(),
                'char': () => this.code.printChar(),
                'boolean': () => this.code.printBoolean()
            }
            tipoPrint[object.type]()

            //Esto es para agregarle el espacio en blanco por el caso de System.out.println("mundo", "hola");
            if (index < valor.length - 1) {
                this.code.li(r.A0, 32)
                this.code.li(r.A7, 11)
                this.code.ecall()
            }

        })

        // Agregado del salto de linea
        this.code.li(r.A0, 10)
        this.code.li(r.A7, 11)
        this.code.ecall()

    }

    /**
    * @type {BaseVisitor['visitDeclaracionVariable']}
    */

    visitDeclaracionVariable(node) {
        this.code.comment(`Declaracion Variable: ${node.id}`)

        if (!node.exp) {
            // Caso de declaración sin asignación (int a;)
            if (this.insideFunction) {

                const localObject = this.code.getFrameLocal(this.frameDclIndex)

                this.code.push(r.HP)

                const palabraNull = "null"
                for (let i = 0; i < palabraNull.length; i++) {
                    this.code.li(r.T0, palabraNull.charCodeAt(i))
                    this.code.sb(r.T0, r.HP)
                    this.code.addi(r.HP, r.HP, 1)
                }

                this.code.sb(r.ZERO, r.HP)
                this.code.addi(r.HP, r.HP, 1)


                const valueObj = { type: 'string', length: 4, valor: 'null' }
                this.code.pushObject(valueObj)

                const tempValueObj = this.code.popObject(r.T0)
                this.code.addi(r.T1, r.FP, -localObject.offset * 4)
                this.code.sw(r.T0, r.T1)

                // Inferir el tipo
                localObject.type = tempValueObj.type
                this.frameDclIndex++

                return
            } else {
                // Si es variable global
                this.code.push(r.HP)

                const palabraNull = "null"
                for (let i = 0; i < palabraNull.length; i++) {
                    this.code.li(r.T0, palabraNull.charCodeAt(i))
                    this.code.sb(r.T0, r.HP)
                    this.code.addi(r.HP, r.HP, 1)
                }

                this.code.sb(r.ZERO, r.HP)
                this.code.addi(r.HP, r.HP, 1)

                //this.code.tagObject(node.id)


                const valueObj = { type: 'string', length: 4, valor: 'null' }
                this.code.pushObject(valueObj)
                this.code.tagObject(node.id)

                return
            }
        } else {
            // Caso de declaración con asignación 
            node.exp.accept(this)

            if (this.insideFunction) {
                const localObject = this.code.getFrameLocal(this.frameDclIndex)
                const valueObj = this.code.popObject(r.T0)

                this.code.addi(r.T1, r.FP, -localObject.offset * 4)
                this.code.sw(r.T0, r.T1)

                // Inferir el tipo
                localObject.type = valueObj.type
                this.frameDclIndex++

                return
            } else {
                this.code.tagObject(node.id)
            }
        }

        this.code.comment(`Fin Declaracion Variable: ${node.id}`)
    }

    /**
    * @type {BaseVisitor['visitAsignacion']}
    */
    visitAsignacion(node) {
        this.code.comment(`Asignacion Variable: ${node.id}`)

        node.asignacion.accept(this)
        const valorObjeto = this.code.popObject(r.T0)
        const [offset, variableObject] = this.code.getObject(node.id)

        if (this.insideFunction) {
            this.code.addi(r.T1, r.FP, -variableObject.offset * 4)
            this.code.sw(r.T0, r.T1)
            variableObject.type = valorObjeto.type
            return
        }

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

    visitAccesoVariable(node) {
        this.code.comment(`Acceso Variable: ${node.id}`)
        const [offset, variableObject] = this.code.getObject(node.id)

        if (this.insideFunction) {
            this.code.addi(r.T1, r.FP, -variableObject.offset * 4)

            if (variableObject.valor === "null" && variableObject.type === "string") {
                this.code.lw(r.T0, r.T1)
                this.code.push(r.T0)
                this.code.pushObject({ type: 'string', length: 4 })
                return
            }

            // Manejo específico por tipo
            if (variableObject.type === 'char') {
                this.code.lb(r.T0, r.T1)
            } else {
                this.code.lw(r.T0, r.T1)
            }

            this.code.push(r.T0)
            this.code.pushObject({ ...variableObject, id: undefined })
            return
        }

        this.code.addi(r.T0, r.SP, offset)
        if (variableObject.valor === "null" && variableObject.type === "string") {
            this.code.lw(r.T1, r.T0)
            this.code.push(r.T1)
            this.code.pushObject({ type: 'string', length: 4 })
            return
        }

        if (variableObject.type === 'char') {
            this.code.lb(r.T1, r.T0)
        } else {
            this.code.lw(r.T1, r.T0)
        }

        this.code.push(r.T1)
        this.code.pushObject({ ...variableObject, id: undefined })

        this.code.comment(`Fin Acceso Variable: ${node.id}`)
    }


    /**
    * @type {BaseVisitor['visitBloque']}
    */
    visitBloque(node) {
        this.code.comment("Inicio de bloque")

        this.code.newScope()

        node.dcls.forEach(d => { d.accept(this) })

        this.code.comment("Reduciendo la pila")
        const bytesToRemove = this.code.endScope()

        if (bytesToRemove > 0) {
            this.code.addi(r.SP, r.SP, bytesToRemove)
        }
        this.code.comment("Fin de bloque")
    }


    /**
    * @type {BaseVisitor['visitIf']}
    */
    visitIf(node) {
        this.code.comment("Inicio del If")

        this.code.comment("Condicion")
        node.condicion.accept(this)

        this.code.popObject(r.T0)

        this.code.comment("Fin de condicion")

        const hasElse = !!node.sentenciasFalse

        if (hasElse) {
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
    visitWhile(node) {

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
    visitFor(node) {

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

        if (bytesToRemove > 0) {
            this.code.addi(r.SP, r.SP, bytesToRemove)

        }

        this.continueLabel = prevContinueLabel
        this.breakLabel = prevBreakLabel

        this.code.comment("Fin del For")

    }


    /**
     * @type {BaseVisitor['visitBreak']}
     */
    visitBreak(node) {
        this.code.j(this.breakLabel)
    }

    /**
     * @type {BaseVisitor['visitContinue']}
     */
    visitContinue(node) {
        this.code.j(this.continueLabel)
    }

    /**
     * @type {BaseVisitor['visitSwitch']}
     */
    visitSwitch(node){
        this.code.comment("Inicio del Switch")
    
        // Evaluar la expresión del switch
        this.code.comment("Evaluación de expresión switch")
        node.inicial.accept(this)
        this.code.popObject(r.T1)  // Guardamos el valor a comparar en T1
        
        const endSwitchLabel = this.code.getLabel()
        const labels = new Map() // Para almacenar los labels de cada caso
        
        // Generar labels para cada caso
        node.casos.forEach(caso => {
            labels.set(caso, this.code.getLabel())
        })
        
        // Label para el default si existe
        const defaultLabel = node.c_default ? this.code.getLabel() : endSwitchLabel
        
        // Comparar con cada caso
        node.casos.forEach(caso => {
            this.code.comment(`Case ${caso.valor}`)
            this.code.li(r.T0, caso.valor)
            this.code.beq(r.T1, r.T0, labels.get(caso))
        })
        
        // Saltar al default si ningún caso coincide
        this.code.j(defaultLabel)
        
        // Generar código para cada caso
        node.casos.forEach((caso, index) => {
            this.code.addLabel(labels.get(caso))
            this.code.comment(`Sentencias case ${caso.exp}`)
            declaraciones.accept(this)
            
            
            // Si no hay break explícito, continuamos al siguiente caso
            if (!caso.tieneBreak) {
                const nextCase = node.casos[index + 1]
                if (nextCase) {
                    this.code.j(labels.get(nextCase))
                } else if (node.casoDefault) {
                    this.code.j(defaultLabel)
                }
            } else {
                this.code.j(endSwitchLabel)
            }
        })
        
        // Generar código para el default si existe
        if (node.c_default) {
            this.code.addLabel(defaultLabel)
            this.code.comment("Default case")
            node.casoDefault.accept(this)
        }
        
        this.code.addLabel(endSwitchLabel)
        this.code.comment("Fin del Switch")
    }

    /**
     * @type {BaseVisitor['visitDeclaracionFuncion']}
     */

    visitDeclaracionFuncion(node) {
        const baseSize = 2 // | ra | fp |
        const paramSize = node.parametros.length // | ra | fp | p1 | p2 | ... | pn |

        const frameVisitor = new FrameVisitor(baseSize + paramSize)
        node.bloque.accept(frameVisitor)
        const localFrame = frameVisitor.frame
        const localSize = localFrame.length // | ra | fp | p1 | p2 | ... | pn | l1 | l2 | ... | ln |

        const returnSize = 1 // | ra | fp | p1 | p2 | ... | pn | l1 | l2 | ... | ln | rv |

        const totalSize = baseSize + paramSize + localSize + returnSize
        this.functionMetada[node.id] = {
            frameSize: totalSize,
            returnType: node.tipo,
        }

        const instruccionesDeMain = this.code.instrucciones
        const instruccionesDeDeclaracionDeFuncion = []
        this.code.instrucciones = instruccionesDeDeclaracionDeFuncion

        node.parametros.forEach((param, index) => {
            this.code.pushObject({
                id: param.id,
                type: param.tipo,
                length: 4,
                offset: baseSize + index
            })
        })

        localFrame.forEach(variableLocal => {
            this.code.pushObject({
                ...variableLocal,
                length: 4,
                type: 'local'
            })
        })

        this.insideFunction = node.id
        this.frameDclIndex = 0
        this.returnLabel = this.code.getLabel()

        this.code.comment(`Declaracion de la funcion: ${node.id}`)
        this.code.addLabel(node.id)

        node.bloque.accept(this)

        this.code.addLabel(this.returnLabel)

        this.code.add(r.T0, r.ZERO, r.FP)
        this.code.lw(r.RA, r.T0)
        this.code.jalr(r.ZERO, r.RA, 0)
        this.code.comment(`Fin de declaracion de la funcion: ${node.id}`)

        //Limpiar metadatos

        for (let index = 0; index < paramSize + localSize; index++) {
            this.code.objectStack.pop()            // aqui no se retrocede el SP (stack pointer), hay que hacerlo luego
        }

        this.code.instrucciones = instruccionesDeMain

        instruccionesDeDeclaracionDeFuncion.forEach(instruccion => {
            this.code.instruccionesDeFunciones.push(instruccion)
        })
        this.insideFunction = false
    }

    /**
     * @type {BaseVisitor['visitLlamada']}
     */
    visitLlamada(node) {
        if (!(node.callee instanceof AccesoVariable)) return

        const nombreFuncion = node.callee.id

        this.code.comment(`Llamada a funcion: ${nombreFuncion}`)


        // ----- Llamada a funciones foraneas
        const etiquetaRetornoLlamada = this.code.getLabel()

        // Guardar los argumentos
        this.code.addi(r.SP, r.SP, -4 * 2)
        node.args.forEach((arg) => {
            arg.accept(this)
        })
        this.code.comment(`se hace antes el vergeo ese xd`)
        this.code.addi(r.SP, r.SP, 4 * (node.args.length + 2))

        // Calcular la direccion del nuevo FP en T1
        this.code.addi(r.T1, r.SP, -4)

        // Guardar direccion de retorno
        this.code.la(r.T0, etiquetaRetornoLlamada)
        this.code.push(r.T0)

        // Guardar el FP
        this.code.push(r.FP)
        this.code.addi(r.FP, r.T1, 0)

        const frameSize = this.functionMetada[nombreFuncion].frameSize
        this.code.addi(r.SP, r.SP, -(frameSize - 2) * 4)

        // Saltar a la funcion
        this.code.j(nombreFuncion)
        this.code.addLabel(etiquetaRetornoLlamada)

        // Recuperamos el valor de retorno
        const returnSize = frameSize - 1
        this.code.addi(r.T0, r.FP, -returnSize * 4)
        this.code.lw(r.A0, r.T0)

        // Regresar el FP al contexto de ejecucion anterior
        this.code.addi(r.T0, r.FP, -4)
        this.code.lw(r.FP, r.T0)

        // Regresar el SP al contexto de ejecucion anterior
        this.code.addi(r.SP, r.SP, frameSize * 4)

        this.code.push(r.A0)
        this.code.pushObject({ type: this.functionMetada[nombreFuncion].returnType, length: 4 })
        this.code.comment(`Fin llamada a funcion: ${nombreFuncion}`)

    }

    /**
     * @type {BaseVisitor['visitReturn']}
     */
    visitReturn(node) {
        this.code.comment(`Inicio Return`)


        if (node.exp) {
            node.exp.accept(this)
            this.code.popObject(r.A0)

            const frameSize = this.functionMetada[this.insideFunction].frameSize
            const returnOffest = frameSize - 1
            this.code.addi(r.T0, r.FP, -returnOffest * 4)
            this.code.sw(r.A0, r.T0)

        }


        this.code.j(this.returnLabel)
        this.code.comment(`Final Return`)

    }

    /**
     * @type {BaseVisitor['visitFuncParseInt']}
     */
    visitFuncParseInt(node) {

        node.exp.accept(this)
        this.code.popObject(r.A0)
        this.code.callBuiltin('parseInt')
        this.code.pushObject({ type: 'int', length: 4 })
    }

    /**
     * @type {BaseVisitor['visitFuncParseFloat']}
     */
    visitFuncParseFloat(node) {
        node.exp.accept(this)
        this.code.popObject(r.A0)
        this.code.callBuiltin('parseFloat')
        this.code.pushObject({ type: 'float', length: 4 })
    }
}



"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiGenerationService = void 0;
var genai_1 = require("@google/genai");
var aiClient = null;
function getAIClient() {
    if (!aiClient) {
        var key = process.env.GEMINI_API_KEY;
        if (!key) {
            // Fallback AI client initialization if key not specified in env
            aiClient = new genai_1.GoogleGenAI({ apiKey: 'DEMO_KEY' });
        }
        else {
            aiClient = new genai_1.GoogleGenAI({
                apiKey: key,
                httpOptions: {
                    headers: { 'User-Agent': 'aistudio-build' }
                }
            });
        }
    }
    return aiClient;
}
exports.aiGenerationService = {
    /**
     * Generate complete structured Test paper with questions, options, and answer key
     */
    generateTest: function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var topic, subject, difficulty, _a, questionCount, _b, durationMins, _c, totalMarks, _d, instructions, prompt, ai, response, text, err_1;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        topic = params.topic, subject = params.subject, difficulty = params.difficulty, _a = params.questionCount, questionCount = _a === void 0 ? 5 : _a, _b = params.durationMins, durationMins = _b === void 0 ? 45 : _b, _c = params.totalMarks, totalMarks = _c === void 0 ? 50 : _c, _d = params.instructions, instructions = _d === void 0 ? '' : _d;
                        prompt = "\nYou are the NeuroClass AI Test Generator. Generate a production-grade academic test paper based on the following parameters:\n- Subject: ".concat(subject, "\n- Topic: ").concat(topic, "\n- Difficulty Level: ").concat(difficulty, "\n- Number of Questions: ").concat(questionCount, "\n- Duration: ").concat(durationMins, " minutes\n- Total Marks: ").concat(totalMarks, "\n").concat(instructions ? "- Extra Instructions: ".concat(instructions) : '', "\n\nRespond ONLY with valid JSON matching this schema:\n{\n  \"title\": \"").concat(topic, " - ").concat(difficulty, " Assessment\",\n  \"subject\": \"").concat(subject, "\",\n  \"totalMarks\": ").concat(totalMarks, ",\n  \"durationMins\": ").concat(durationMins, ",\n  \"instructions\": \"Answer all questions clearly. Proctoring is active.\",\n  \"questions\": [\n    {\n      \"id\": \"q1\",\n      \"questionNumber\": 1,\n      \"text\": \"Question statement here\",\n      \"type\": \"mcq\" or \"short-answer\",\n      \"marks\": 10,\n      \"options\": [\"Option A\", \"Option B\", \"Option C\", \"Option D\"], // null if short-answer\n      \"correctAnswer\": \"Option A or model answer\",\n      \"explanation\": \"Brief explanation of why this answer is correct\"\n    }\n  ]\n}\n");
                        _e.label = 1;
                    case 1:
                        _e.trys.push([1, 3, , 4]);
                        ai = getAIClient();
                        return [4 /*yield*/, ai.models.generateContent({
                                model: 'gemini-2.5-flash',
                                contents: prompt,
                                config: {
                                    temperature: 0.4,
                                    responseMimeType: 'application/json'
                                }
                            })];
                    case 2:
                        response = _e.sent();
                        text = response.text || '';
                        return [2 /*return*/, JSON.parse(text)];
                    case 3:
                        err_1 = _e.sent();
                        console.warn('Gemini test generation fallback triggered:', err_1.message);
                        // Structured fallback if API key is unconfigured or rate limited
                        return [2 /*return*/, {
                                title: "".concat(topic, " - ").concat(difficulty, " Assessment (AI Generated)"),
                                subject: subject,
                                totalMarks: totalMarks,
                                durationMins: durationMins,
                                instructions: instructions || 'Answer all questions. Anti-cheat proctoring enabled.',
                                questions: Array.from({ length: questionCount }).map(function (_, idx) { return ({
                                    id: "q-".concat(idx + 1),
                                    questionNumber: idx + 1,
                                    text: "[".concat(difficulty, "] Evaluate ").concat(topic, " principles for scenario #").concat(idx + 1, "."),
                                    type: idx % 2 === 0 ? 'mcq' : 'short-answer',
                                    marks: Math.round(totalMarks / questionCount),
                                    options: idx % 2 === 0 ? [
                                        "Primary property of ".concat(topic),
                                        "Secondary fallback of ".concat(topic),
                                        "Asymptotic upper bound limit",
                                        "Inverse boundary condition"
                                    ] : undefined,
                                    correctAnswer: "Primary property of ".concat(topic),
                                    explanation: "Demonstrates fundamental concepts in ".concat(subject, ".")
                                }); })
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    },
    /**
     * Generate AI Assignment with problem statement, criteria, and rubrics
     */
    generateAssignment: function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var topic, subject, difficulty, totalMarks, instructions, prompt, ai, response, text, err_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        topic = params.topic, subject = params.subject, difficulty = params.difficulty, totalMarks = params.totalMarks, instructions = params.instructions;
                        prompt = "\nYou are the NeuroClass AI Assignment Architect. Draft a comprehensive student assignment:\n- Topic: ".concat(topic, "\n- Subject: ").concat(subject, "\n- Difficulty: ").concat(difficulty, "\n- Total Marks: ").concat(totalMarks, "\n").concat(instructions ? "- Teacher Guidelines: ".concat(instructions) : '', "\n\nRespond ONLY in JSON matching this schema:\n{\n  \"title\": \"").concat(topic, " Applied Research & Practical Assignment\",\n  \"subject\": \"").concat(subject, "\",\n  \"totalMarks\": ").concat(totalMarks, ",\n  \"problemStatement\": \"Detailed description of the assignment problem statement and objective...\",\n  \"learningObjectives\": [\"Objective 1\", \"Objective 2\", \"Objective 3\"],\n  \"evaluationCriteria\": [\n    { \"name\": \"Content & Methodology\", \"maxMarks\": ").concat(Math.round(totalMarks * 0.4), ", \"description\": \"Core concepts correctness and analytical rigor.\" },\n    { \"name\": \"Structure & Formatting\", \"maxMarks\": ").concat(Math.round(totalMarks * 0.3), ", \"description\": \"Clarity of presentation, diagrams, and section flow.\" },\n    { \"name\": \"Originality & Citations\", \"maxMarks\": ").concat(Math.round(totalMarks * 0.3), ", \"description\": \"Plagiarism-free original analysis.\" }\n  ],\n  \"sampleTestCases\": [\"Verify edge case for empty input\", \"Check asymptotic time complexity\"]\n}\n");
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        ai = getAIClient();
                        return [4 /*yield*/, ai.models.generateContent({
                                model: 'gemini-2.5-flash',
                                contents: prompt,
                                config: {
                                    temperature: 0.4,
                                    responseMimeType: 'application/json'
                                }
                            })];
                    case 2:
                        response = _a.sent();
                        text = response.text || '';
                        return [2 /*return*/, JSON.parse(text)];
                    case 3:
                        err_2 = _a.sent();
                        console.warn('Gemini assignment generation fallback triggered:', err_2.message);
                        return [2 /*return*/, {
                                title: "".concat(topic, " Applied Assignment"),
                                subject: subject,
                                totalMarks: totalMarks,
                                problemStatement: "Develop a comprehensive solution demonstrating deep understanding of ".concat(topic, " in ").concat(subject, ". Ensure proper documentation and test verification."),
                                learningObjectives: [
                                    "Master fundamental constructs of ".concat(topic),
                                    "Implement robust edge-case validations",
                                    "Synthesize analytical findings in structured report"
                                ],
                                evaluationCriteria: [
                                    { name: 'Core Implementation', maxMarks: Math.round(totalMarks * 0.5), description: 'Correctness and technical accuracy' },
                                    { name: 'Documentation & Structure', maxMarks: Math.round(totalMarks * 0.3), description: 'Clean presentation and clear reasoning' },
                                    { name: 'Originality', maxMarks: Math.round(totalMarks * 0.2), description: 'Independent work and citation standards' }
                                ],
                                sampleTestCases: [
                                    "Boundary condition validation for ".concat(topic),
                                    "Performance benchmarking under standard load"
                                ]
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    }
};

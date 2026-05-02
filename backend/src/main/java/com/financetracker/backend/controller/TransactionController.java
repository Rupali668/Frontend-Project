package com.financetracker.backend.controller;

import com.financetracker.backend.dto.SummaryResponse;
import com.financetracker.backend.dto.TransactionRequest;
import com.financetracker.backend.entity.Transaction;
import com.financetracker.backend.entity.TransactionType;
import com.financetracker.backend.service.AuthService;
import com.financetracker.backend.service.TransactionService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/transactions")
@CrossOrigin(origins = "http://localhost:5173")
public class TransactionController {

    private final TransactionService transactionService;
    private final AuthService authService;

    public TransactionController(TransactionService transactionService, AuthService authService) {
        this.transactionService = transactionService;
        this.authService = authService;
    }

    @GetMapping
    public List<Transaction> getTransactions(
        @RequestHeader(name = "Authorization", required = false) String authorizationHeader,
        @RequestParam(required = false) String search,
        @RequestParam(required = false) TransactionType type,
        @RequestParam(required = false) String category
    ) {
        var user = authService.getAuthenticatedUser(authorizationHeader);
        return transactionService.getTransactions(user, search, type, category);
    }

    @GetMapping("/{id}")
    public Transaction getTransaction(
        @RequestHeader(name = "Authorization", required = false) String authorizationHeader,
        @PathVariable Long id
    ) {
        var user = authService.getAuthenticatedUser(authorizationHeader);
        return transactionService.getTransactionById(user, id);
    }

    @GetMapping("/summary")
    public SummaryResponse getSummary(@RequestHeader(name = "Authorization", required = false) String authorizationHeader) {
        var user = authService.getAuthenticatedUser(authorizationHeader);
        return transactionService.getSummary(user);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Transaction createTransaction(
        @RequestHeader(name = "Authorization", required = false) String authorizationHeader,
        @Valid @RequestBody TransactionRequest request
    ) {
        var user = authService.getAuthenticatedUser(authorizationHeader);
        return transactionService.createTransaction(user, request);
    }

    @PutMapping("/{id}")
    public Transaction updateTransaction(
        @RequestHeader(name = "Authorization", required = false) String authorizationHeader,
        @PathVariable Long id,
        @Valid @RequestBody TransactionRequest request
    ) {
        var user = authService.getAuthenticatedUser(authorizationHeader);
        return transactionService.updateTransaction(user, id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTransaction(
        @RequestHeader(name = "Authorization", required = false) String authorizationHeader,
        @PathVariable Long id
    ) {
        var user = authService.getAuthenticatedUser(authorizationHeader);
        transactionService.deleteTransaction(user, id);
    }
}

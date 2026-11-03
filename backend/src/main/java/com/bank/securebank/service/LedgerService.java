package com.bank.securebank.service;

import com.bank.securebank.dto.VerifyChainResponse;
import com.bank.securebank.model.AuditBlock;
import com.bank.securebank.repository.AuditBlockRepository;
import com.bank.securebank.util.HashUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
public class LedgerService {

    private static final String GENESIS_HASH = "0".repeat(64);

    private final AuditBlockRepository repository;

    public LedgerService(AuditBlockRepository repository) {
        this.repository = repository;
    }

    /**
     * Appends a new block to the hash chain.
     * blockHash = SHA-256(prevHash + blockIndex + userId + eventType + payloadHash + createdAt)
     */
    // Runs in its own transaction so audit entries (e.g. LOGIN_FAILED) are
    // persisted even when the surrounding auth transaction rolls back.
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public synchronized AuditBlock append(Long userId, String eventType, String payload) {
        AuditBlock last = repository.findTopByOrderByBlockIndexDesc().orElse(null);

        long blockIndex = (last == null) ? 0L : last.getBlockIndex() + 1;
        String prevHash = (last == null) ? GENESIS_HASH : last.getBlockHash();
        String payloadHash = HashUtils.sha256Hex(payload);
        // Truncate to microseconds so the value survives the MySQL DATETIME(6)
        // round-trip unchanged; otherwise the recomputed hash would differ and
        // a valid chain would look tampered after reloading from the database.
        LocalDateTime createdAt = LocalDateTime.now().truncatedTo(ChronoUnit.MICROS);

        String canonical = prevHash
                + blockIndex
                + userId
                + eventType
                + payloadHash
                + createdAt;
        String blockHash = HashUtils.sha256Hex(canonical);

        AuditBlock block = new AuditBlock();
        block.setBlockIndex(blockIndex);
        block.setUserId(userId);
        block.setEventType(eventType);
        block.setPayloadHash(payloadHash);
        block.setPrevHash(prevHash);
        block.setBlockHash(blockHash);
        block.setCreatedAt(createdAt);

        return repository.save(block);
    }

    @Transactional(readOnly = true)
    public List<AuditBlock> getChain() {
        return repository.findAllByOrderByBlockIndexAsc();
    }

    @Transactional(readOnly = true)
    public VerifyChainResponse verifyChain() {
        List<AuditBlock> blocks = repository.findAllByOrderByBlockIndexAsc();

        String expectedPrev = GENESIS_HASH;
        long expectedIndex = 0L;

        for (AuditBlock block : blocks) {
            if (block.getBlockIndex() != expectedIndex) {
                return new VerifyChainResponse(false, blocks.size(),
                        "Broken chain: expected block index " + expectedIndex
                                + " but found " + block.getBlockIndex());
            }
            if (!expectedPrev.equals(block.getPrevHash())) {
                return new VerifyChainResponse(false, blocks.size(),
                        "Broken chain: prev_hash mismatch at block " + block.getBlockIndex());
            }

            String canonical = block.getPrevHash()
                    + block.getBlockIndex()
                    + block.getUserId()
                    + block.getEventType()
                    + block.getPayloadHash()
                    + block.getCreatedAt();
            String recomputed = HashUtils.sha256Hex(canonical);

            if (!recomputed.equals(block.getBlockHash())) {
                return new VerifyChainResponse(false, blocks.size(),
                        "Tampered block detected at index " + block.getBlockIndex());
            }

            expectedPrev = block.getBlockHash();
            expectedIndex++;
        }

        return new VerifyChainResponse(true, blocks.size(), "Chain is valid and untampered");
    }
}
